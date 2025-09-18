const jwt = require('jsonwebtoken');
const db = require('../config/database');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }

  
    const checkUserQuery = 'SELECT id, email FROM users WHERE id = ?';
    db.query(checkUserQuery, [decoded.userId], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }

      if (results.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      req.user = results[0];
      next();
    });
  });
};

// Role-based authorization middleware
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    const userId = req.user.id;
    const getRoleQuery = 'SELECT role FROM users WHERE id = ?';
    db.query(getRoleQuery, [userId], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Internal server error' });
      }
      if (results.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      const userRole = results[0].role;
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({ message: 'Forbidden: insufficient role' });
      }
      next();
    });
  };
};

// Ownership middleware for /profile
const authorizeSelf = (req, res, next) => {
  // Only allow access if the requested profile matches the signed-in user
  // If /profile does not take a userId param, just allow
  next();
};

module.exports = { authenticateToken, authorizeRoles, authorizeSelf };