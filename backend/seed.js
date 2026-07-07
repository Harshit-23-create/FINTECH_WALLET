const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const dummyUsers = [
    { email: 'harshitsoni567890@gmail.com', currency: 'INR' },
    { email: 'john.doe@example.com', currency: 'USD' },
    { email: 'alice.smith@example.com', currency: 'EUR' },
    { email: 'mohammed.ali@example.com', currency: 'AED' }
  ];

  for (const u of dummyUsers) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      const user = await prisma.user.create({
        data: {
          email: u.email,
          passwordHash: passwordHash
        }
      });
      await prisma.wallet.create({
        data: {
          userId: user.id,
          balance: 1000.0,
          currency: u.currency
        }
      });
      console.log(`Created user ${u.email} with 1000 ${u.currency}`);
    } else {
      console.log(`User ${u.email} already exists.`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
