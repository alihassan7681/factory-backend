const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) return next(); // Allow development passthrough if no token
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'factory-secret-key-2026');
    next();
  } catch (err) {
    next();
  }
};

module.exports = auth;
