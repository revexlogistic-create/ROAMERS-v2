'use strict';
/**
 * middleware/auth.js — JWT verification middleware
 *
 * Security hardening:
 *  - Ghost-admin bypass removed (issue #6)
 *  - tokenVersion field checked to invalidate tokens after password change (issue #17)
 *  - Editor role supported via editorOrAdmin helper
 */

var jwt = require('jsonwebtoken');
var db  = require('../database');

/* All valid user roles */
var VALID_ROLES = ['admin', 'editor', 'user'];

function auth(req, res, next) {
  var header = req.headers.authorization || '';
  var token  = header.startsWith('Bearer ') ? header.slice(7).trim() : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    var payload = jwt.verify(token, process.env.JWT_SECRET);

    /* Look up the live user record — no ghost fallbacks */
    var user = db.users.find(function(u){ return u.id === payload.id; });
    if (!user) return res.status(401).json({ error: 'User not found' });

    /* tokenVersion check — invalidates tokens issued before last password change */
    var tv = typeof payload.tv === 'number' ? payload.tv : 0;
    if (tv !== (user.tokenVersion || 0)) {
      return res.status(401).json({ error: 'Token is no longer valid — please log in again' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function adminOnly(req, res, next) {
  auth(req, res, function() {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
}

/* Allows both admin and editor roles */
function editorOrAdmin(req, res, next) {
  auth(req, res, function() {
    if (req.user.role !== 'admin' && req.user.role !== 'editor') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  });
}

function optionalAuth(req, res, next) {
  var header = req.headers.authorization || '';
  var token  = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  req.user   = null;
  if (token) {
    try {
      var payload = jwt.verify(token, process.env.JWT_SECRET);
      var user    = db.users.find(function(u){ return u.id === payload.id; });
      if (user) {
        var tv = typeof payload.tv === 'number' ? payload.tv : 0;
        if (tv === (user.tokenVersion || 0)) req.user = user;
      }
    } catch (_) { /* invalid token — treat as unauthenticated */ }
  }
  next();
}

module.exports = { auth, adminOnly, editorOrAdmin, optionalAuth, VALID_ROLES };
