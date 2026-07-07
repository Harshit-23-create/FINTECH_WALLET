const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const authMiddleware = require('../middleware/auth');
const { checkFraud } = require('../services/fraudDetection');
const { convertCurrency, getExchangeRate } = require('../utils/exchange');

// Get transaction history
router.get('/', authMiddleware, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { senderId: req.user.id },
          { receiverId: req.user.id }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { email: true } },
        receiver: { select: { email: true } }
      }
    });

    res.json(transactions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Transfer funds
router.post('/transfer', authMiddleware, async (req, res) => {
  try {
    const { receiverEmail, amount, description, category } = req.body;
    const senderId = req.user.id;

    if (amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    const receiver = await prisma.user.findUnique({ where: { email: receiverEmail } });
    if (!receiver) {
      return res.status(404).json({ message: 'Receiver not found' });
    }

    if (receiver.id === senderId) {
      return res.status(400).json({ message: 'Cannot transfer to yourself' });
    }

    // Process transaction transactionally using Prisma Interactive Transaction
    const result = await prisma.$transaction(async (tx) => {
      const senderWallet = await tx.wallet.findUnique({ where: { userId: senderId } });
      if (senderWallet.balance < amount) {
        throw new Error('Insufficient funds');
      }

      const receiverWallet = await tx.wallet.findUnique({ where: { userId: receiver.id } });
      
      const exchangeRate = getExchangeRate(senderWallet.currency, receiverWallet.currency);
      const convertedAmount = convertCurrency(amount, senderWallet.currency, receiverWallet.currency);

      // Deduct from sender
      await tx.wallet.update({
        where: { userId: senderId },
        data: { balance: { decrement: amount } }
      });

      // Add to receiver
      await tx.wallet.update({
        where: { userId: receiver.id },
        data: { balance: { increment: convertedAmount } }
      });

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          amount,
          currency: senderWallet.currency,
          exchangeRate,
          senderId,
          receiverId: receiver.id,
          description,
          category: category || 'TRANSFER',
          status: 'COMPLETED'
        }
      });

      return transaction;
    });

    // Check fraud post-transaction (or pre-transaction, depending on policy.
    // For this mock, we flag it after and could theoretically freeze funds if needed)
    await checkFraud(senderId, amount, result.id);

    // Re-fetch transaction in case it was flagged
    const finalTransaction = await prisma.transaction.findUnique({ where: { id: result.id } });

    res.json({ message: 'Transfer successful', transaction: finalTransaction });
  } catch (err) {
    if (err.message === 'Insufficient funds') {
      return res.status(400).json({ message: 'Insufficient funds' });
    }
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
