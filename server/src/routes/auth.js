const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'officilist-secret-key-change-in-production';
const JWT_EXPIRES_IN = '30d';

// Default password hash for "officilist123"
// In production, set PASSWORD_HASH env variable with your own bcrypt hash
const DEFAULT_PASSWORD_HASH = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.G4rvqRCPKq8xPO';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Heslo je povinné.' });
    }

    const storedHash = process.env.PASSWORD_HASH || DEFAULT_PASSWORD_HASH;
    const isValid = await bcrypt.compare(password, storedHash);

    if (!isValid) {
      return res.status(401).json({ error: 'Nesprávné heslo.' });
    }

    const token = jwt.sign(
      { user: 'admin', loginAt: new Date().toISOString() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      expiresIn: JWT_EXPIRES_IN
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Chyba při přihlašování.' });
  }
});

// POST /api/auth/verify
router.post('/verify', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.json({ valid: false });
  }

  try {
    jwt.verify(token, JWT_SECRET);
    res.json({ valid: true });
  } catch (err) {
    res.json({ valid: false });
  }
});

// Utility endpoint to generate password hash (use once, then remove or protect)
router.post('/hash', async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }
  const hash = await bcrypt.hash(password, 12);
  res.json({ hash });
});

module.exports = router;
