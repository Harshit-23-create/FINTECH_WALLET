const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const authMiddleware = require('../middleware/auth');
const { convertCurrency, getExchangeRate } = require('../utils/exchange');

// Get user's payment requests (both sent and received)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await prisma.paymentRequest.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      include: {
        sender: { select: { email: true } },
        receiver: { select: { email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(requests);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Create a new payment request (asking for money)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { email, amount, description } = req.body;
    const senderId = req.user.id; // The person asking for money

    if (amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const receiver = await prisma.user.findUnique({ where: { email } });
    if (!receiver) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (receiver.id === senderId) {
      return res.status(400).json({ message: 'Cannot request money from yourself' });
    }

    // Sender's wallet determines the requested currency
    const senderWallet = await prisma.wallet.findUnique({ where: { userId: senderId } });

    const request = await prisma.paymentRequest.create({
      data: {
        amount,
        currency: senderWallet.currency,
        description,
        senderId, // The person who wants the money
        receiverId: receiver.id // The person who must pay
      }
    });

    res.status(201).json({ message: 'Request sent successfully', request });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Respond to a payment request (pay or decline)
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { action } = req.body; // 'PAID' or 'REJECTED'
    const requestId = req.params.id;
    const userId = req.user.id;

    const request = await prisma.paymentRequest.findUnique({ where: { id: requestId } });

    if (!request) return res.status(404).json({ message: 'Request not found' });
    
    // Only the receiver of the request can pay or decline it
    if (request.receiverId !== userId) {
      return res.status(403).json({ message: 'Unauthorized action' });
    }

    if (request.status !== 'PENDING') {
      return res.status(400).json({ message: 'Request is already processed' });
    }

    if (action === 'REJECTED') {
      const updated = await prisma.paymentRequest.update({
        where: { id: requestId },
        data: { status: 'REJECTED' }
      });
      return res.json({ message: 'Request declined', request: updated });
    }

    if (action === 'PAID') {
      // Process transaction
      const senderId = request.receiverId; // The one paying
      const receiverId = request.senderId; // The one receiving the money

      const result = await prisma.$transaction(async (tx) => {
        const senderWallet = await tx.wallet.findUnique({ where: { userId: senderId } });
        const receiverWallet = await tx.wallet.findUnique({ where: { userId: receiverId } });

        // Request amount is in receiverWallet's currency
        const amountRequested = request.amount;
        const exchangeRate = getExchangeRate(receiverWallet.currency, senderWallet.currency);
        
        // Cost to sender (payer)
        const costToSender = convertCurrency(amountRequested, receiverWallet.currency, senderWallet.currency);

        if (senderWallet.balance < costToSender) {
          throw new Error('Insufficient funds');
        }

        // Deduct from payer
        await tx.wallet.update({
          where: { userId: senderId },
          data: { balance: { decrement: costToSender } }
        });

        // Add to requester
        await tx.wallet.update({
          where: { userId: receiverId },
          data: { balance: { increment: amountRequested } }
        });

        // Create transaction record
        await tx.transaction.create({
          data: {
            amount: costToSender,
            currency: senderWallet.currency,
            exchangeRate,
            senderId,
            receiverId,
            description: request.description || 'Payment Request',
            category: 'TRANSFER',
            status: 'COMPLETED'
          }
        });

        const updatedRequest = await tx.paymentRequest.update({
          where: { id: requestId },
          data: { status: 'PAID' }
        });

        return updatedRequest;
      });

      return res.json({ message: 'Request paid successfully', request: result });
    }

    res.status(400).json({ message: 'Invalid action' });
  } catch (err) {
    if (err.message === 'Insufficient funds') {
      return res.status(400).json({ message: 'Insufficient funds' });
    }
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
