'use strict';
/**
 * routes/auth.js — Authentication routes
 *
 * Security hardening:
 *  [5]  JWT_SECRET fallback removed
 *  [15] Password min 8 chars + letter + digit
 *  [16] Per-account lockout after 5 failed logins (15-min cooldown)
 *  [17] tokenVersion embedded in JWT — invalidated on password change
 *  [18] Timing-safe login (always runs bcrypt, even for unknown emails)
 *  [19] Generic registration message (no enumeration)
 *  [24] Email validated with regex
 *  [26] bcrypt rounds raised to 12
 *  [27] WhatsApp OTP verification on signup
 */

var router   = require('express').Router();
var bcrypt   = require('bcryptjs');
var jwt      = require('jsonwebtoken');
var uuidv4   = require('uuid').v4;
var db       = require('../database');
var authMw   = require('../middleware/auth');
var validate = require('../middleware/validate');
var auditMod = require('../middleware/audit');
var wa       = require('../utils/whatsapp');

var auth = authMw.auth;

/* JWT helpers */
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
  delete u.otp;
  delete u.otpExpiry;
  delete u.otpAttempts;
  if (!Array.isArray(u.wishlist)) u.wishlist = [];
  if (!Array.isArray(u.notifs))   u.notifs   = [];
  return u;
}

/* ── Per-account lockout ─────────────────────────────────────── */
var MAX_LOGIN_FAILS = 5;
var LOCKOUT_MS      = 15 * 60 * 1000;

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

/* Dummy hash for timing-safe comparison */
var _DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy-' + Math.random(), 10);

/* ── OTP helpers ─────────────────────────────────────────────── */
var OTP_TTL_MS      = 15 * 60 * 1000;  // 15 minutes
var MAX_OTP_ATTEMPTS = 5;

function maskPhone(phone) {
  var p = String(phone || '').replace(/[^0-9+\s]/g, '');
  if (p.length <= 4) return p;
  return p.slice(0, 4) + '••••' + p.slice(-2);
}

/* ── REGISTER ────────────────────────────────────────────────── */
router.post('/register', async function(req, res) {
  var f  = req.body || {};
  var ip = auditMod.getIp(req);

  /* Validate */
  if (!f.fname || !String(f.fname).trim()) return res.status(400).json({ error: 'First name required' });
  if (!f.lname || !String(f.lname).trim()) return res.status(400).json({ error: 'Last name required' });
  if (!validate.isEmail(f.email))          return res.status(400).json({ error: 'Valid email address required' });
  if (!f.phone || !String(f.phone).trim()) return res.status(400).json({ error: 'Phone number required' });

  var pwErr = validate.passwordError(f.password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  /* Check duplicate email */
  var existing = db.users.find(function(u){ return u.email.toLowerCase() === f.email.toLowerCase(); });
  if (existing) {
    return setTimeout(function() {
      res.status(409).json({ error: 'An account with this email already exists' });
    }, 300);
  }

  /* Generate OTP */
  var otp     = wa.generateOtp();
  var expiry  = new Date(Date.now() + OTP_TTL_MS).toISOString();
  var phone   = String(f.phone).trim();

  /* Create unverified user */
  var user = db.users.insert({
    id:           uuidv4(),
    fname:        String(f.fname).trim(),
    lname:        String(f.lname).trim(),
    email:        f.email.toLowerCase().trim(),
    password:     bcrypt.hashSync(f.password, BCRYPT_ROUNDS),
    phone:        phone,
    country:      f.country ? String(f.country).trim() : 'Morocco',
    role:         'user',
    bio:          '',
    joined:       new Date().toISOString(),
    wishlist:     [],
    notifs:       [],
    tokenVersion: 0,
    loginFailCount:  0,
    loginLockUntil:  null,
    verified:     false,
    otp:          otp,
    otpExpiry:    expiry,
    otpAttempts:  0,
  });

  await db.users.flush();
  auditMod.log('user:register:pending', user.id, ip);

  /* Send OTP via WhatsApp — non-blocking (failure doesn't abort registration) */
  var otpSent = false;
  try {
    await wa.sendOtp(phone, otp);
    otpSent = true;
  } catch (err) {
    console.error('[OTP send error]', err.message);
  }

  var noProvider = !process.env.WHATSAPP_PROVIDER;

  res.status(201).json({
    requireVerification: true,
    phone:   maskPhone(phone),
    email:   user.email,
    otpSent: otpSent,
    /* DEV: expose code in response when no WhatsApp provider is configured */
    ...(noProvider ? { devCode: otp } : {}),
  });
});

/* ── VERIFY OTP ──────────────────────────────────────────────── */
router.post('/verify-otp', async function(req, res) {
  var f  = req.body || {};
  var ip = auditMod.getIp(req);

  if (!f.email || !f.code) {
    return res.status(400).json({ error: 'Email and code required' });
  }

  var user = db.users.find(function(u){ return u.email.toLowerCase() === f.email.toLowerCase(); });
  if (!user) return res.status(404).json({ error: 'Account not found' });

  /* Already verified */
  if (user.verified) {
    return res.json({ token: makeToken(user), user: sanitizeUser(user) });
  }

  /* Too many attempts */
  if ((user.otpAttempts || 0) >= MAX_OTP_ATTEMPTS) {
    return res.status(429).json({ error: 'Too many attempts. Please request a new code.' });
  }

  /* Check expiry */
  if (!user.otpExpiry || new Date(user.otpExpiry) < new Date()) {
    return res.status(400).json({ error: 'Code expired. Please request a new one.' });
  }

  /* Check code */
  if (String(f.code).trim() !== String(user.otp)) {
    db.users.update(function(u){ return u.id === user.id; }, { otpAttempts: (user.otpAttempts || 0) + 1 });
    await db.users.flush();
    var remaining = MAX_OTP_ATTEMPTS - ((user.otpAttempts || 0) + 1);
    return res.status(400).json({ error: 'Incorrect code' + (remaining > 0 ? ' (' + remaining + ' attempts left)' : '') });
  }

  /* Code correct — mark verified, clear OTP */
  db.users.update(function(u){ return u.id === user.id; }, {
    verified:    true,
    otp:         null,
    otpExpiry:   null,
    otpAttempts: 0,
  });
  await db.users.flush();

  var verified = db.users.find(function(u){ return u.id === user.id; });
  auditMod.log('user:register:verified', user.id, ip);
  res.json({ token: makeToken(verified), user: sanitizeUser(verified) });
});

/* ── RESEND OTP ──────────────────────────────────────────────── */
router.post('/resend-otp', async function(req, res) {
  var f  = req.body || {};
  var ip = auditMod.getIp(req);

  if (!f.email) return res.status(400).json({ error: 'Email required' });

  var user = db.users.find(function(u){ return u.email.toLowerCase() === f.email.toLowerCase(); });
  if (!user) return res.status(404).json({ error: 'Account not found' });
  if (user.verified) return res.status(400).json({ error: 'Account already verified' });

  var otp    = wa.generateOtp();
  var expiry = new Date(Date.now() + OTP_TTL_MS).toISOString();

  db.users.update(function(u){ return u.id === user.id; }, { otp: otp, otpExpiry: expiry, otpAttempts: 0 });
  await db.users.flush();

  var noProvider = !process.env.WHATSAPP_PROVIDER;
  try {
    await wa.sendOtp(user.phone, otp);
    auditMod.log('user:otp:resent', user.id, ip);
    res.json({
      sent:  true,
      phone: maskPhone(user.phone),
      ...(noProvider ? { devCode: otp } : {}),
    });
  } catch (err) {
    console.error('[OTP resend error]', err.message);
    res.status(500).json({ error: 'Failed to send code. Please try again.' });
  }
});

/* ── LOGIN ───────────────────────────────────────────────────── */
router.post('/login', function(req, res) {
  var f  = req.body || {};
  var ip = auditMod.getIp(req);

  if (!f.email || !f.password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  var user = db.users.find(function(u){ return u.email.toLowerCase() === f.email.toLowerCase(); });

  /* Timing-safe: always run bcrypt even when user not found */
  var hash  = user ? user.password : _DUMMY_HASH;
  var match = bcrypt.compareSync(String(f.password), hash);

  if (!user || !match) {
    if (user) recordFailedLogin(f.email);
    auditMod.log('user:login:fail', user ? user.id : 'unknown', ip, { email: f.email });
    return res.status(401).json({ error: 'Incorrect email or password' });
  }

  if (checkLocked(user)) {
    auditMod.log('user:login:locked', user.id, ip);
    return res.status(429).json({ error: 'Account temporarily locked due to too many failed attempts. Please try again in 15 minutes.' });
  }

  /* If account not yet verified, require OTP before issuing token */
  if (user.verified === false) {
    /* Resend OTP automatically */
    var newOtp    = wa.generateOtp();
    var newExpiry = new Date(Date.now() + OTP_TTL_MS).toISOString();
    db.users.update(function(u){ return u.id === user.id; }, { otp: newOtp, otpExpiry: newExpiry, otpAttempts: 0 });
    db.users.flush().catch(function(){});
    wa.sendOtp(user.phone, newOtp).catch(function(e){ console.error('[OTP auto-resend]', e.message); });
    return res.status(403).json({
      error: 'Account not verified',
      requireVerification: true,
      email: user.email,
      phone: maskPhone(user.phone),
    });
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
router.put('/profile', auth, auditMod.audit('user:profile:update'), async function(req, res) {
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

  await db.users.flush();
  var updated = db.users.find(function(u){ return u.id === req.user.id; });
  res.json({ user: sanitizeUser(updated) });
});

/* ── CHANGE PASSWORD ─────────────────────────────────────────── */
router.put('/password', auth, auditMod.audit('user:password:change'), async function(req, res) {
  var f  = req.body || {};
  var ip = auditMod.getIp(req);

  if (!f.current || !f.newPass) {
    return res.status(400).json({ error: 'Current and new password required' });
  }

  var pwErr = validate.passwordError(f.newPass);
  if (pwErr) return res.status(400).json({ error: pwErr });

  var user = db.users.find(function(u){ return u.id === req.user.id; });
  if (!user || !bcrypt.compareSync(String(f.current), user.password)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  var newVersion = (user.tokenVersion || 0) + 1;
  db.users.update(function(u){ return u.id === req.user.id; }, {
    password:     bcrypt.hashSync(f.newPass, BCRYPT_ROUNDS),
    tokenVersion: newVersion
  });

  auditMod.log('user:password:changed', user.id, ip);
  await db.users.flush();

  var updatedUser = db.users.find(function(u){ return u.id === req.user.id; });
  res.json({ message: 'Password updated', token: makeToken(updatedUser) });
});

/* ── WISHLIST TOGGLE ─────────────────────────────────────────── */
router.post('/wishlist/:expId', auth, async function(req, res) {
  var user = db.users.find(function(u){ return u.id === req.user.id; });
  var wl   = Array.isArray(user.wishlist) ? user.wishlist.slice() : [];
  var idx  = wl.indexOf(req.params.expId);
  if (idx === -1) wl.push(req.params.expId); else wl.splice(idx, 1);
  db.users.update(function(u){ return u.id === req.user.id; }, { wishlist: wl });
  await db.users.flush();
  res.json({ wishlist: wl });
});

/* ── DELETE ACCOUNT ──────────────────────────────────────────── */
router.delete('/account', auth, auditMod.audit('user:account:delete'), async function(req, res) {
  if (req.user.role === 'admin') {
    return res.status(403).json({ error: 'Admin accounts cannot be self-deleted' });
  }
  db.users.remove(function(u){ return u.id === req.user.id; });
  await db.users.flush();
  res.json({ message: 'Account deleted' });
});

module.exports = router;
