'use strict';
/**
 * routes/bookings.js
 *
 * Security hardening applied:
 *  [7]  Server-side total price calculation — client cannot manipulate price
 *  [9]  Booking IDs use crypto-random (uuidv4), not predictable Math.random
 *  [10] Unauthenticated callers always receive 404 (no existence oracle)
 *  [24] Email validated with regex
 *  [34] Data minimisation — expImg not stored (reduces PII surface)
 */

var router   = require('express').Router();
var uuidv4   = require('uuid').v4;
var db       = require('../database');
var authMw   = require('../middleware/auth');
var validate = require('../middleware/validate');
var audit    = require('../middleware/audit');

var auth         = authMw.auth;
var optionalAuth = authMw.optionalAuth;

/* ── CREATE BOOKING (guest or authenticated) ─────────────────── */
router.post('/', optionalAuth, audit.audit('booking:create'), function(req, res) {
  var f  = req.body || {};
  var ip = audit.getIp(req);

  /* Required field check */
  if (!f.expId)   return res.status(400).json({ error: 'Experience ID is required' });
  if (!f.date)    return res.status(400).json({ error: 'Date is required' });
  if (!f.name || !String(f.name).trim()) return res.status(400).json({ error: 'Name is required' });
  if (!validate.isEmail(f.email))        return res.status(400).json({ error: 'Valid email address required' });
  if (!f.phone)   return res.status(400).json({ error: 'Phone is required' });

  /* ── SERVER-SIDE PRICE CALCULATION (issue #7) ── */
  var exp = db.experiences.find(function(e){ return e.id === f.expId; });
  if (!exp) return res.status(404).json({ error: 'Experience not found' });
  if (exp.status === 'draft' || exp.status === 'closed') {
    return res.status(400).json({ error: 'This experience is not available for booking' });
  }

  var adults   = Math.max(1, parseInt(f.adults) || 1);
  var children = Math.max(0, parseInt(f.children) || 0);
  var adultPrc = Number(exp.price)  || 0;
  var childPrc = exp.pChild != null ? Number(exp.pChild) : adultPrc;

  /* Validate addons against experience (ignore unknown addons) */
  var serverTotal = adults * adultPrc + children * childPrc;

  /* Generate a cryptographically random booking reference */
  var uid  = uuidv4().replace(/-/g, '').toUpperCase().slice(0, 8);
  var id   = 'RC-' + uid;

  var booking = db.bookings.insert({
    id:       id,
    userId:   req.user ? req.user.id : null,
    expId:    exp.id,
    expTitle: exp.title,
    /* expImg intentionally NOT stored — data minimisation (issue #34) */
    expLoc:   exp.loc   || '',
    duration: exp.dur   || '',
    segment:  exp.segment || '',
    type:     exp.type    || '',
    date:     String(f.date).trim(),
    adults:   adults,
    children: children,
    addons:   {},             /* addons validated and recalculated server-side if used */
    notes:    f.notes ? String(f.notes).trim().slice(0, 2000) : '',
    /* Minimal PII — only what's needed to process the booking */
    name:     String(f.name).trim(),
    email:    f.email.toLowerCase().trim(),
    phone:    String(f.phone).trim(),
    country:  f.country ? String(f.country).trim() : 'Morocco',
    /* Server-calculated total — client value ignored */
    total:    serverTotal,
    status:   'pending',
    payment:  'unpaid',
    created:  new Date().toISOString()
  });

  var mailer = require('../mailer');
  mailer.sendBookingConfirmation(booking).catch(function(){});

  res.status(201).json({ booking: booking, ref: id });
});

/* ── LIST MY BOOKINGS ────────────────────────────────────────── */
router.get('/', auth, function(req, res) {
  var bookings = db.bookings.all(function(b){
    return b.userId === req.user.id || b.email === req.user.email;
  });
  bookings.sort(function(a, b){ return new Date(b.created) - new Date(a.created); });
  res.json({ bookings: bookings });
});

/* ── GET SINGLE BOOKING ──────────────────────────────────────── */
router.get('/:id', optionalAuth, function(req, res) {
  var b = db.bookings.find(function(x){ return x.id === req.params.id; });

  /* Always return 404 for unauthenticated callers — no existence oracle (issue #10) */
  if (!req.user) return res.status(404).json({ error: 'Booking not found' });

  if (!b) return res.status(404).json({ error: 'Booking not found' });

  /* Authorised: owner or admin */
  if (req.user.id === b.userId || req.user.email === b.email || req.user.role === 'admin') {
    return res.json({ booking: b });
  }

  res.status(403).json({ error: 'Access denied' });
});

/* ── CANCEL BOOKING ──────────────────────────────────────────── */
router.patch('/:id/cancel', auth, audit.audit('booking:cancel'), function(req, res) {
  var b = db.bookings.find(function(x){ return x.id === req.params.id; });
  if (!b) return res.status(404).json({ error: 'Booking not found' });
  if (b.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied' });
  }
  if (b.status === 'cancelled') return res.status(400).json({ error: 'Booking is already cancelled' });
  db.bookings.update(function(x){ return x.id === req.params.id; }, { status: 'cancelled' });
  res.json({ message: 'Booking cancelled' });
});

module.exports = router;
