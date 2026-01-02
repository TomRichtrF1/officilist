const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'officilist-secret-key-change-in-production';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Přístup odepřen. Token nebyl poskytnut.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Neplatný token.' });
  }
}

module.exports = authenticateToken;
