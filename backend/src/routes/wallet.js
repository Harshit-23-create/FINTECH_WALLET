const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const authMiddleware = require('../middleware/auth');

// Get wallet balance
router.get('/', authMiddleware, async (req, res) => {
  try {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: req.user.id }
    });
    
    if (!wallet) {
      return res.status(404).json({ message: 'Wallet not found' });
    }

    res.json(wallet);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Top up wallet (Mock implementation of Payment Gateway)
router.post('/topup', authMiddleware, async (req, res) => {
  try {
    const { amount } = req.body;
    
    if (amount <= 0) {
      return res.status(400).json({ message: 'Invalid amount' });
    }

    // Here you would normally integrate with Stripe or another payment gateway
    // e.g., const paymentIntent = await stripe.paymentIntents.create({...})

    const wallet = await prisma.wallet.update({
      where: { userId: req.user.id },
      data: { balance: { increment: amount } }
    });

    await prisma.transaction.create({
      data: {
        amount,
        receiverId: req.user.id,
        description: 'Wallet Top Up via Credit Card',
        status: 'COMPLETED'
      }
    });

    res.json({ message: 'Top up successful', balance: wallet.balance });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Change wallet currency
router.put('/currency', authMiddleware, async (req, res) => {
  try {
    const { currency } = req.body;
    const validCurrencies = ['USD', 'INR', 'AED', 'EUR'];
    
    if (!validCurrencies.includes(currency)) {
      return res.status(400).json({ message: 'Invalid currency' });
    }

    const wallet = await prisma.wallet.update({
      where: { userId: req.user.id },
      data: { currency }
    });

    res.json({ message: 'Currency updated successfully', currency: wallet.currency });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
