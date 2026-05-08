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
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    let user = db.users.find(function(u){ return u.id === payload.id; });
    if (!user && payload.role === 'admin') {
      // Vercel cold start: DB wiped but JWT is valid — find admin by email
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@roamerscommunity.ma';
      user = db.users.find(function(u){ return u.email === adminEmail; }) ||
             { id: payload.id, role: 'admin', email: adminEmail, fname: 'Admin', lname: '', wishlist: [], notifs: [] };
    }
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
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      req.user = db.users.find(function(u){ return u.id === payload.id; }) || null;
    } catch (_) { req.user = null; }
  } else {
    req.user = null;
  }
  next();
}

module.exports = { auth, adminOnly, optionalAuth };
