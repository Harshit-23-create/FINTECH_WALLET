const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const prisma = require('../prisma');
const authMiddleware = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

// Register User
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    let user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        wallet: {
          create: {
            balance: 1000.0, // initial bonus balance
          }
        }
      }
    });

    res.status(201).json({ message: 'User registered successfully', userId: user.id });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Login User
router.post('/login', async (req, res) => {
  try {
    const { email, password, otp } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check 2FA
    if (user.isTwoFactorEnabled) {
      if (!otp) {
        return res.status(403).json({ message: 'OTP required for 2FA', require2fa: true });
      }
      const verified = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token: otp
      });
      if (!verified) {
        return res.status(400).json({ message: 'Invalid OTP' });
      }
    }

    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, user: { id: user.id, email: user.email, isTwoFactorEnabled: user.isTwoFactorEnabled } });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Setup 2FA
router.post('/setup-2fa', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    
    if (user.isTwoFactorEnabled) {
      return res.status(400).json({ message: '2FA is already enabled' });
    }

    const secret = speakeasy.generateSecret({ name: `FinTechWallet (${user.email})` });

    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorSecret: secret.base32 }
    });

    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
      res.json({ secret: secret.base32, qrCode: data_url });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Verify and Enable 2FA
router.post('/verify-2fa', authMiddleware, async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: otp
    });

    if (verified) {
      await prisma.user.update({
        where: { id: user.id },
        data: { isTwoFactorEnabled: true }
      });
      res.json({ message: '2FA enabled successfully' });
    } else {
      res.status(400).json({ message: 'Invalid OTP' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get Current User Info
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ 
      where: { id: req.user.id },
      select: { id: true, email: true, isTwoFactorEnabled: true }
    });
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get all users for the directory
router.get('/users', authMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true }
    });
    // Exclude the currently logged in user
    const directory = users.filter(u => u.id !== req.user.id);
    res.json(directory);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
