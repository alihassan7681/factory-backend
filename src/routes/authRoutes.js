const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Setting = require('../models/Setting');

// Helper to get or create settings
const getSettings = async () => {
  let settings = await Setting.findOne();
  if (!settings) {
    settings = new Setting({
      adminName: 'Factory Admin',
      adminEmail: 'admin@factory.com',
      adminPassword: 'admin123',
    });
    await settings.save();
  }
  return settings;
};

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const settings = await getSettings();
    const validEmail = (settings.adminEmail || 'admin@factory.com').toLowerCase();
    const validPassword = settings.adminPassword || 'admin123';
    const inputEmail = email.trim().toLowerCase();

    if ((inputEmail === validEmail || inputEmail === 'admin') && password === validPassword) {
      const user = {
        name: settings.adminName || 'Factory Admin',
        email: settings.adminEmail || 'admin@factory.com',
        role: 'admin',
      };
      const token = jwt.sign(
        user,
        process.env.JWT_SECRET || 'factory-secret-key-2026',
        { expiresIn: '30d' }
      );
      return res.json({ token, user });
    }

    return res.status(401).json({ message: 'Invalid email or password' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', async (req, res) => {
  try {
    const { oldPassword, newPassword, name, email } = req.body;
    const settings = await getSettings();
    const currentPass = settings.adminPassword || 'admin123';

    if (oldPassword !== currentPass) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    if (newPassword && newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    if (name && name.trim()) {
      settings.adminName = name.trim();
    }
    if (email && email.trim()) {
      settings.adminEmail = email.trim();
    }
    if (newPassword && newPassword.trim()) {
      settings.adminPassword = newPassword.trim();
    }

    await settings.save();

    res.json({
      success: true,
      message: 'Password and credentials updated successfully in database.',
      user: {
        name: settings.adminName,
        email: settings.adminEmail,
        role: 'admin',
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/credentials
router.get('/credentials', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json({
      name: settings.adminName || 'Factory Admin',
      email: settings.adminEmail || 'admin@factory.com',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

