const prisma = require('../prisma');

const checkFraud = async (senderId, amount, transactionId) => {
  // Simple fraud detection rules:
  // 1. Transaction amount over 5000 is flagged.
  // 2. Velocity rule: More than 3 transactions in the last 10 minutes.

  let isFraudulent = false;
  const alerts = [];

  // Rule 1: High value
  if (amount > 5000) {
    isFraudulent = true;
    alerts.push({
      type: 'HIGH_VALUE_TRANSFER',
      message: `Unusually high transfer amount of $${amount}.`,
    });
  }

  // Rule 2: Velocity
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
  const recentTransactions = await prisma.transaction.count({
    where: {
      senderId,
      createdAt: { gte: tenMinutesAgo }
    }
  });

  if (recentTransactions >= 3) {
    isFraudulent = true;
    alerts.push({
      type: 'VELOCITY_ALERT',
      message: `High frequency of transactions detected (${recentTransactions} in 10 mins).`,
    });
  }

  if (isFraudulent) {
    // Create alerts
    for (const alert of alerts) {
      await prisma.alert.create({
        data: {
          type: alert.type,
          message: alert.message,
          userId: senderId,
          transactionId
        }
      });
    }

    // Flag transaction
    await prisma.transaction.update({
      where: { id: transactionId },
      data: { status: 'FLAGGED' }
    });
  }

  return isFraudulent;
};

module.exports = { checkFraud };
