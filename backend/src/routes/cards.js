const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const authMiddleware = require('../middleware/auth');

// Get user's cards
router.get('/', authMiddleware, async (req, res) => {
  try {
    const cards = await prisma.card.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });
    res.json(cards);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Issue a new virtual card
router.post('/issue', authMiddleware, async (req, res) => {
  try {
    // Generate mock card details
    const cardNumber = Array.from({length: 16}, () => Math.floor(Math.random() * 10)).join('');
    const expiry = `${String(new Date().getMonth() + 1).padStart(2, '0')}/${String(new Date().getFullYear() + 4).slice(-2)}`;
    const cvv = Array.from({length: 3}, () => Math.floor(Math.random() * 10)).join('');

    const card = await prisma.card.create({
      data: {
        cardNumber,
        expiry,
        cvv,
        userId: req.user.id
      }
    });

    res.status(201).json(card);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Freeze a card
router.put('/:id/freeze', authMiddleware, async (req, res) => {
  try {
    const card = await prisma.card.update({
      where: { id: req.params.id, userId: req.user.id },
      data: { status: 'FROZEN' }
    });
    res.json(card);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

// Unfreeze a card
router.put('/:id/unfreeze', authMiddleware, async (req, res) => {
  try {
    const card = await prisma.card.update({
      where: { id: req.params.id, userId: req.user.id },
      data: { status: 'ACTIVE' }
    });
    res.json(card);
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
