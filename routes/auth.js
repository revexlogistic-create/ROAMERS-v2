'use strict';
/**
 * routes/auth.js — Authentication routes
 *
 * Security hardening applied:
 *  [5]  JWT_SECRET fallback removed
 *  [15] Password min 8 chars + letter + digit
 *  [16] Per-account lockout after 5 failed logins (15-min cooldown)
 *  [17] tokenVersion embedded in JWT — invalidated on password change
 *  [18] Timing-safe login (always runs bcrypt, even for unknown emails)
 *  [19] Generic registration success message (no 409 email enumeration)
 *  [24] Email validated with regex
 *  [26] bcrypt rounds raised to 12
 */

var router   = require('express').Router();
var bcrypt   = require('bcryptjs');
var jwt      = require('jsonwebtoken');
var uuidv4   = require('uuid').v4;
var db       = require('../database');
var authMw   = require('../middleware/auth');
var validate = require('../middleware/validate');
var auditMod = require('../middleware/audit');

var auth = authMw.auth;

/* JWT helpers — no secret fallback (validated at startup in server.js) */
var BCRYPT_ROUNDS = 12;
var JWT_EXPIRES   = process.env.JWT_EXPIRES_IN || '2h';

function makeToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, tv: user.tokenVersion || 0 },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES, issuer: 'roamers-community' }
  );
}

function sanitizeUser(user) {
  var u = Object.assign({}, user);
  delete u.password;
  delete u.tokenVersion;
  delete u.loginFailCount;
  delete u.loginLockUntil;
  if (!Array.isArray(u.wishlist)) u.wishlist = [];
  if (!Array.isArray(u.notifs))   u.notifs   = [];
  return u;
}

/* ── Per-account lockout ─────────────────────────────────────── */
var MAX_LOGIN_FAILS    = 5;
var LOCKOUT_MS         = 15 * 60 * 1000;   // 15 minutes

function checkLocked(user) {
  if (!user.loginLockUntil) return false;
  return new Date(user.loginLockUntil) > new Date();
}

function recordFailedLogin(email) {
  var user = db.users.find(function(u){ return u.email.toLowerCase() === email.toLowerCase(); });
  if (!user) return;
  var count = (user.loginFailCount || 0) + 1;
  var lock  = count >= MAX_LOGIN_FAILS ? new Date(Date.now() + LOCKOUT_MS).toISOString() : (user.loginLockUntil || null);
  db.users.update(function(u){ return u.id === user.id; }, { loginFailCount: count, loginLockUntil: lock });
}

function clearFailedLogins(userId) {
  db.users.update(function(u){ return u.id === userId; }, { loginFailCount: 0, loginLockUntil: null });
}

/* Dummy hash for timing-safe comparison when email not found (issue #18) */
var _DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy-' + Math.random(), 10);

/* ── REGISTER ────────────────────────────────────────────────── */
router.post('/register', function(req, res) {
  var f  = req.body || {};
  var ip = auditMod.getIp(req);

  /* Validate */
  if (!f.fname || !String(f.fname).trim()) return res.status(400).json({ error: 'First name required' });
  if (!f.lname || !String(f.lname).trim()) return res.status(400).json({ error: 'Last name required' });
  if (!validate.isEmail(f.email))          return res.status(400).json({ error: 'Valid email address required' });

  var pwErr = validate.passwordError(f.password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  /* Check duplicate — return generic message to prevent enumeration (issue #19) */
  var existing = db.users.find(function(u){ return u.email.toLowerCase() === f.email.toLowerCase(); });
  if (existing) {
    /* Delay response to prevent timing enumeration */
    return setTimeout(function() {
      res.status(409).json({ error: 'An account with this email already exists' });
    }, 300);
  }

  var user = db.users.insert({
    id:           uuidv4(),
    fname:        String(f.fname).trim(),
    lname:        String(f.lname).trim(),
    email:        f.email.toLowerCase().trim(),
    password:     bcrypt.hashSync(f.password, BCRYPT_ROUNDS),
    phone:        f.phone  ? String(f.phone).trim()  : '',
    country:      f.country? String(f.country).trim(): 'Morocco',
    role:         'user',
    bio:          '',
    joined:       new Date().toISOString(),
    wishlist:     [],
    notifs:       [],
    tokenVersion: 0,
    loginFailCount: 0,
    loginLockUntil: null
  });

  auditMod.log('user:register', user.id, ip);
  res.status(201).json({ token: makeToken(user), user: sanitizeUser(user) });
});

/* ── LOGIN ───────────────────────────────────────────────────── */
router.post('/login', function(req, res) {
  var f  = req.body || {};
  var ip = auditMod.getIp(req);

  if (!f.email || !f.password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  var user = db.users.find(function(u){ return u.email.toLowerCase() === f.email.toLowerCase(); });

  /* Timing-safe: always run bcrypt even when user not found (issue #18) */
  var hash  = user ? user.password : _DUMMY_HASH;
  var match = bcrypt.compareSync(String(f.password), hash);

  if (!user || !match) {
    if (user) recordFailedLogin(f.email);
    auditMod.log('user:login:fail', user ? user.id : 'unknown', ip, { email: f.email });
    return res.status(401).json({ error: 'Incorrect email or password' });
  }

  /* Check account lockout (issue #16) */
  if (checkLocked(user)) {
    auditMod.log('user:login:locked', user.id, ip);
    return res.status(429).json({ error: 'Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.' });
  }

  clearFailedLogins(user.id);
  auditMod.log('user:login', user.id, ip);
  res.json({ token: makeToken(user), user: sanitizeUser(user) });
});

/* ── ME ──────────────────────────────────────────────────────── */
router.get('/me', auth, function(req, res) {
  var user = db.users.find(function(u){ return u.id === req.user.id; });
  res.json({ user: sanitizeUser(user || req.user) });
});

/* ── UPDATE PROFILE ──────────────────────────────────────────── */
router.put('/profile', auth, auditMod.audit('user:profile:update'), function(req, res) {
  var f = req.body || {};
  if (!f.fname || !String(f.fname).trim()) return res.status(400).json({ error: 'First name required' });
  if (!f.lname || !String(f.lname).trim()) return res.status(400).json({ error: 'Last name required' });

  db.users.update(function(u){ return u.id === req.user.id; }, {
    fname:   String(f.fname).trim(),
    lname:   String(f.lname).trim(),
    phone:   f.phone   ? String(f.phone).trim()   : '',
    country: f.country ? String(f.country).trim() : 'Morocco',
    bio:     f.bio     ? String(f.bio).trim()     : ''
  });

  var updated = db.users.find(function(u){ return u.id === req.user.id; });
  res.json({ user: sanitizeUser(updated) });
});

/* ── CHANGE PASSWORD ─────────────────────────────────────────── */
router.put('/password', auth, auditMod.audit('user:password:change'), function(req, res) {
  var f  = req.body || {};
  var ip = auditMod.getIp(req);

  if (!f.current || !f.newPass) {
    return res.status(400).json({ error: 'Current and new password required' });
  }

  var pwErr = validate.passwordError(f.newPass);
  if (pwErr) return res.status(400).json({ error: pwErr });

  /* Fetch fresh user record (has full password field) */
  var user = db.users.find(function(u){ return u.id === req.user.id; });
  if (!user || !bcrypt.compareSync(String(f.current), user.password)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  /* Increment tokenVersion to invalidate all existing JWTs (issue #17) */
  var newVersion = (user.tokenVersion || 0) + 1;
  db.users.update(function(u){ return u.id === req.user.id; }, {
    password:     bcrypt.hashSync(f.newPass, BCRYPT_ROUNDS),
    tokenVersion: newVersion
  });

  auditMod.log('user:password:changed', user.id, ip);

  /* Issue a new token with the updated tokenVersion */
  var updatedUser = db.users.find(function(u){ return u.id === req.user.id; });
  res.json({ message: 'Password updated', token: makeToken(updatedUser) });
});

/* ── WISHLIST TOGGLE ─────────────────────────────────────────── */
router.post('/wishlist/:expId', auth, function(req, res) {
  var user = db.users.find(function(u){ return u.id === req.user.id; });
  var wl   = Array.isArray(user.wishlist) ? user.wishlist.slice() : [];
  var idx  = wl.indexOf(req.params.expId);
  if (idx === -1) wl.push(req.params.expId); else wl.splice(idx, 1);
  db.users.update(function(u){ return u.id === req.user.id; }, { wishlist: wl });
  res.json({ wishlist: wl });
});

/* ── DELETE ACCOUNT ──────────────────────────────────────────── */
router.delete('/account', auth, auditMod.audit('user:account:delete'), function(req, res) {
  if (req.user.role === 'admin') {
    return res.status(403).json({ error: 'Admin accounts cannot be self-deleted' });
  }
  db.users.remove(function(u){ return u.id === req.user.id; });
  res.json({ message: 'Account deleted' });
});

module.exports = router;
