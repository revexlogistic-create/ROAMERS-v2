/**
 * middleware/auth.js — JWT verification middleware
 */
const jwt = require('jsonwebtoken');
const db  = require('../database');

function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    const user = db.users.find(function(u){ return u.id === payload.id; });
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminOnly(req, res, next) {
  auth(req, res, function () {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
      req.user = db.users.find(function(u){ return u.id === payload.id; }) || null;
    } catch (_) { req.user = null; }
  } else {
    req.user = null;
  }
  next();
}

module.exports = { auth, adminOnly, optionalAuth };
