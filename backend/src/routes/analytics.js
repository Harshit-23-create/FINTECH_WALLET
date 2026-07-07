const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const authMiddleware = require('../middleware/auth');

router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get alerts for the user
    const alerts = await prisma.alert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Aggregate spending vs receiving over time (mock logic for charts)
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
      },
      orderBy: { createdAt: 'asc' }
    });

    // Simple grouping by date
    const chartData = {};
    const categoryData = {};

    transactions.forEach(tx => {
      const date = tx.createdAt.toISOString().split('T')[0];
      if (!chartData[date]) {
        chartData[date] = { date, income: 0, expense: 0 };
      }
      
      if (tx.senderId === userId) {
        chartData[date].expense += tx.amount;
        
        // Track spending by category
        const cat = tx.category || 'GENERAL';
        categoryData[cat] = (categoryData[cat] || 0) + tx.amount;
      }
      if (tx.receiverId === userId) {
        chartData[date].income += tx.amount;
      }
    });

    const dataArray = Object.values(chartData);
    const catArray = Object.keys(categoryData).map(name => ({ name, value: categoryData[name] }));

    res.json({
      alerts,
      chartData: dataArray,
      categoryData: catArray
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Mark alert as read
router.put('/alerts/:id/read', authMiddleware, async (req, res) => {
  try {
    await prisma.alert.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });
    res.json({ message: 'Alert marked as read' });
  } catch (err) {
    res.status(500).send('Server error');
  }
});

module.exports = router;
