'use strict';
/**
 * routes/admin.js
 *
 * Security hardening applied:
 *  [2]  PATCH /bookings/:id — whitelist updatable fields only
 *  [3]  PUT /settings — whitelist permitted settings keys
 *  [4]  PATCH /team/:id — role validated against allowlist
 *  [11] Admin write endpoints have audit logging
 *  [13] CMS HTML fields sanitised before storage
 *  [25] Every write operation is audit-logged (Law 09-08)
 */

var router   = require('express').Router();
var uuidv4   = require('uuid').v4;
var bcrypt   = require('bcryptjs');
var db       = require('../database');
var authMw   = require('../middleware/auth');
var auditMod = require('../middleware/audit');
var validate = require('../middleware/validate');

var adminOnly  = authMw.adminOnly;
var VALID_ROLES = authMw.VALID_ROLES;

router.use(adminOnly);

/* ── STATS ──────────────────────────────────────────────────── */
router.get('/stats', function(req, res) {
  res.json({
    totalBookings: db.bookings.count(),
    totalRevenue:  db.bookings.sum('total', function(b){ return b.status !== 'cancelled'; }),
    pendingBk:     db.bookings.count(function(b){ return b.status === 'pending'; }),
    totalUsers:    db.users.count(function(u){ return u.role === 'user'; }),
    newPlanReqs:   db.plans.count(function(p){ return p.status === 'new'; }),
    newTeamReqs:   db.teams.count(function(t){ return t.status === 'new'; }),
    newMessages:   db.contacts.count(function(c){ return c.status === 'unread'; })
  });
});

/* ── BOOKINGS ────────────────────────────────────────────────── */
router.get('/bookings', function(req, res) {
  var list = db.bookings.all().sort(function(a, b){ return new Date(b.created) - new Date(a.created); });
  res.json({ bookings: list, total: list.length });
});

/* Whitelist: only operational fields can be changed by admin (issue #2) */
var BOOKING_ALLOWED_STATUS  = ['pending','confirmed','completed','cancelled'];
var BOOKING_ALLOWED_PAYMENT = ['unpaid','paid','refunded'];

router.patch('/bookings/:id', auditMod.audit('admin:booking:update'), function(req, res) {
  var f  = req.body || {};
  var bk = db.bookings.find(function(b){ return b.id === req.params.id; });
  if (!bk) return res.status(404).json({ error: 'Booking not found' });

  var changes = {};
  if (f.status  !== undefined) {
    if (!BOOKING_ALLOWED_STATUS.includes(f.status)) return res.status(400).json({ error: 'Invalid status value' });
    changes.status = f.status;
  }
  if (f.payment !== undefined) {
    if (!BOOKING_ALLOWED_PAYMENT.includes(f.payment)) return res.status(400).json({ error: 'Invalid payment value' });
    changes.payment = f.payment;
  }
  if (f.notes   !== undefined) changes.notes   = String(f.notes || '').slice(0, 2000);

  if (!Object.keys(changes).length) return res.status(400).json({ error: 'Nothing to update' });

  db.bookings.update(function(b){ return b.id === req.params.id; }, changes);
  res.json({ message: 'Updated' });
});

router.delete('/bookings/:id', auditMod.audit('admin:booking:delete'), function(req, res) {
  var bk = db.bookings.find(function(b){ return b.id === req.params.id; });
  if (!bk) return res.status(404).json({ error: 'Booking not found' });
  db.bookings.remove(function(b){ return b.id === req.params.id; });
  res.json({ message: 'Booking deleted', id: req.params.id });
});

/* ── USERS ───────────────────────────────────────────────────── */
router.get('/users', function(req, res) {
  var users = db.users.all().map(function(u){
    var x = Object.assign({}, u);
    delete x.password;
    delete x.tokenVersion;
    delete x.loginFailCount;
    delete x.loginLockUntil;
    return x;
  });
  res.json({ users: users });
});

/* Create team member */
router.post('/team', auditMod.audit('admin:user:create'), function(req, res) {
  var f = req.body || {};
  if (!f.fname || !String(f.fname).trim()) return res.status(400).json({ error: 'First name required' });
  if (!validate.isEmail(f.email))          return res.status(400).json({ error: 'Valid email required' });

  if (!f.password) return res.status(400).json({ error: 'Password is required for new team member' });
  var pwErr = validate.passwordError(f.password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  /* Validate role (issue #4) */
  var role = f.role || 'editor';
  if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role. Allowed: ' + VALID_ROLES.join(', ') });

  if (db.users.find(function(u){ return u.email.toLowerCase() === f.email.toLowerCase(); })) {
    return res.status(409).json({ error: 'Email already exists' });
  }

  var user = db.users.insert({
    id:           uuidv4(),
    fname:        String(f.fname).trim(),
    lname:        f.lname ? String(f.lname).trim() : '',
    email:        f.email.toLowerCase().trim(),
    password:     bcrypt.hashSync(f.password, 12),
    phone:        f.phone   ? String(f.phone).trim()   : '',
    country:      f.country ? String(f.country).trim() : 'Morocco',
    role:         role,
    bio:          '',
    joined:       new Date().toISOString(),
    wishlist:     [],
    notifs:       [],
    tokenVersion: 0,
    loginFailCount: 0,
    loginLockUntil: null
  });

  var out = Object.assign({}, user);
  delete out.password;
  delete out.tokenVersion;
  res.status(201).json({ message: 'User created', user: out });
});

/* Update team member — validated field whitelist (issue #4) */
router.patch('/team/:id', auditMod.audit('admin:user:update'), function(req, res) {
  var f    = req.body || {};
  var user = db.users.find(function(u){ return u.id === req.params.id; });
  if (!user) return res.status(404).json({ error: 'User not found' });

  var changes = {};
  if (f.fname !== undefined) changes.fname = String(f.fname || '').trim();
  if (f.lname !== undefined) changes.lname = String(f.lname || '').trim();
  if (f.phone !== undefined) changes.phone = String(f.phone || '').trim();

  if (f.email !== undefined) {
    if (!validate.isEmail(f.email)) return res.status(400).json({ error: 'Valid email required' });
    changes.email = f.email.toLowerCase().trim();
  }

  /* Validate role strictly (issue #4) */
  if (f.role !== undefined) {
    if (!VALID_ROLES.includes(f.role)) {
      return res.status(400).json({ error: 'Invalid role. Allowed: ' + VALID_ROLES.join(', ') });
    }
    /* Cannot demote the last admin */
    if (user.role === 'admin' && f.role !== 'admin') {
      var adminCount = db.users.count(function(u){ return u.role === 'admin'; });
      if (adminCount <= 1) return res.status(400).json({ error: 'Cannot change the role of the last admin' });
    }
    changes.role = f.role;
  }

  if (!Object.keys(changes).length) return res.status(400).json({ error: 'Nothing to update' });

  db.users.update(function(u){ return u.id === req.params.id; }, changes);
  res.json({ message: 'User updated' });
});

/* Unlock a locked user account */
router.post('/team/:id/unlock', auditMod.audit('admin:user:unlock'), function(req, res) {
  var user = db.users.find(function(u){ return u.id === req.params.id; });
  if (!user) return res.status(404).json({ error: 'User not found' });
  db.users.update(function(u){ return u.id === req.params.id; }, { loginFailCount: 0, loginLockUntil: null });
  res.json({ message: 'User account unlocked' });
});

router.delete('/team/:id', auditMod.audit('admin:user:delete'), function(req, res) {
  var user = db.users.find(function(u){ return u.id === req.params.id; });
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.role === 'admin') {
    var adminCount = db.users.count(function(u){ return u.role === 'admin'; });
    if (adminCount <= 1) return res.status(400).json({ error: 'Cannot delete the last admin' });
  }
  db.users.remove(function(u){ return u.id === req.params.id; });
  res.json({ message: 'User deleted', id: req.params.id });
});

/* ── PLAN REQUESTS ───────────────────────────────────────────── */
router.get('/plan-requests', function(req, res) {
  res.json({ requests: db.plans.all().sort(function(a, b){ return new Date(b.created) - new Date(a.created); }) });
});
router.patch('/plan-requests/:id', auditMod.audit('admin:plan:update'), function(req, res) {
  var allowed = ['new','reviewing','quoted','closed'];
  if (req.body.status && !allowed.includes(req.body.status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.plans.update(function(p){ return p.id === req.params.id; }, { status: req.body.status });
  res.json({ message: 'Updated' });
});

/* ── TEAM BUILDING REQUESTS ──────────────────────────────────── */
router.get('/team-requests', function(req, res) {
  res.json({ requests: db.teams.all().sort(function(a, b){ return new Date(b.created) - new Date(a.created); }) });
});
router.patch('/team-requests/:id', auditMod.audit('admin:team-req:update'), function(req, res) {
  var allowed = ['new','reviewing','quoted','closed'];
  if (req.body.status && !allowed.includes(req.body.status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.teams.update(function(t){ return t.id === req.params.id; }, { status: req.body.status });
  res.json({ message: 'Updated' });
});

/* ── MESSAGES (contacts) ─────────────────────────────────────── */
router.get('/messages', function(req, res) {
  res.json({ messages: db.contacts.all().sort(function(a, b){ return new Date(b.created) - new Date(a.created); }) });
});
router.patch('/messages/:id', auditMod.audit('admin:message:update'), function(req, res) {
  var allowed = ['unread','read','archived'];
  if (req.body.status && !allowed.includes(req.body.status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  db.contacts.update(function(c){ return c.id === req.params.id; }, { status: req.body.status });
  res.json({ message: 'Updated' });
});
router.delete('/messages/:id', auditMod.audit('admin:message:delete'), function(req, res) {
  var msg = db.contacts.find(function(c){ return c.id === req.params.id; });
  if (!msg) return res.status(404).json({ error: 'Message not found' });
  db.contacts.remove(function(c){ return c.id === req.params.id; });
  res.json({ message: 'Message deleted', id: req.params.id });
});

/* ── ACTIVITIES ──────────────────────────────────────────────── */
var ACTIVITY_CATS    = ['adventure','culture','corporate','wellness','other'];
var ACTIVITY_STATUS  = ['active','inactive'];

router.get('/activities', function(req, res) {
  res.json({ activities: db.activities.all().sort(function(a, b){ return new Date(a.created) - new Date(b.created); }) });
});

router.post('/activities', auditMod.audit('admin:activity:create'), function(req, res) {
  var f = req.body || {};
  if (!f.title || !String(f.title).trim()) return res.status(400).json({ error: 'Title required' });
  if (f.category && !ACTIVITY_CATS.includes(f.category)) return res.status(400).json({ error: 'Invalid category' });
  if (f.status   && !ACTIVITY_STATUS.includes(f.status)) return res.status(400).json({ error: 'Invalid status' });
  var now = new Date().toISOString();
  var doc = db.activities.insert({
    id:       uuidv4(),
    title:    String(f.title).trim(),
    category: ACTIVITY_CATS.includes(f.category) ? f.category : 'adventure',
    duration: f.duration ? String(f.duration).trim() : '',
    price:    Math.max(0, parseInt(f.price) || 0),
    status:   ACTIVITY_STATUS.includes(f.status) ? f.status : 'active',
    desc:     f.desc ? String(f.desc).trim() : '',
    created:  now, updated: now
  });
  res.status(201).json({ activity: doc });
});

router.put('/activities/:id', auditMod.audit('admin:activity:update'), function(req, res) {
  var existing = db.activities.find(function(a){ return a.id === req.params.id; });
  if (!existing) return res.status(404).json({ error: 'Activity not found' });
  var f = req.body || {};
  var changes = { updated: new Date().toISOString() };
  if (f.title    !== undefined) changes.title    = String(f.title || '').trim();
  if (f.desc     !== undefined) changes.desc     = String(f.desc  || '').trim();
  if (f.duration !== undefined) changes.duration = String(f.duration || '').trim();
  if (f.price    !== undefined) changes.price    = Math.max(0, parseInt(f.price) || 0);
  if (f.category !== undefined) {
    if (!ACTIVITY_CATS.includes(f.category)) return res.status(400).json({ error: 'Invalid category' });
    changes.category = f.category;
  }
  if (f.status !== undefined) {
    if (!ACTIVITY_STATUS.includes(f.status)) return res.status(400).json({ error: 'Invalid status' });
    changes.status = f.status;
  }
  db.activities.update(function(a){ return a.id === req.params.id; }, changes);
  var updated = db.activities.find(function(a){ return a.id === req.params.id; });
  res.json({ activity: updated });
});

router.delete('/activities/:id', auditMod.audit('admin:activity:delete'), function(req, res) {
  var a = db.activities.find(function(x){ return x.id === req.params.id; });
  if (!a) return res.status(404).json({ error: 'Activity not found' });
  db.activities.remove(function(x){ return x.id === req.params.id; });
  res.json({ message: 'Activity deleted', id: req.params.id });
});

/* ── PARTNERS ────────────────────────────────────────────────── */
var PARTNER_TYPES   = ['Tour Operator','Hotel','Transport','Activity','Other'];
var PARTNER_STATUS  = ['active','inactive','suspended'];

router.get('/partners', function(req, res) {
  res.json({ partners: db.partners.all().sort(function(a, b){ return new Date(a.created) - new Date(b.created); }) });
});

router.post('/partners', auditMod.audit('admin:partner:create'), function(req, res) {
  var f = req.body || {};
  if (!f.name || !String(f.name).trim()) return res.status(400).json({ error: 'Partner name required' });
  if (f.email && !validate.isEmail(f.email)) return res.status(400).json({ error: 'Valid email required' });
  var now = new Date().toISOString();
  var doc = db.partners.insert({
    id:       uuidv4(),
    name:     String(f.name).trim(),
    country:  f.country  ? String(f.country).trim()  : '',
    type:     PARTNER_TYPES.includes(f.type) ? f.type : 'Tour Operator',
    contact:  f.contact  ? String(f.contact).trim()  : '',
    email:    f.email    ? f.email.toLowerCase().trim() : '',
    phone:    f.phone    ? String(f.phone).trim()    : '',
    status:   PARTNER_STATUS.includes(f.status) ? f.status : 'active',
    trips:    Array.isArray(f.trips) ? f.trips : [],
    programs: Math.max(0, parseInt(f.programs) || 0),
    revenue:  Math.max(0, parseInt(f.revenue)  || 0),
    created:  now, updated: now
  });
  res.status(201).json({ partner: doc });
});

router.put('/partners/:id', auditMod.audit('admin:partner:update'), function(req, res) {
  var existing = db.partners.find(function(p){ return p.id === req.params.id; });
  if (!existing) return res.status(404).json({ error: 'Partner not found' });
  var f = req.body || {};
  var changes = { updated: new Date().toISOString() };
  if (f.name    !== undefined) changes.name    = String(f.name || '').trim();
  if (f.country !== undefined) changes.country = String(f.country || '').trim();
  if (f.contact !== undefined) changes.contact = String(f.contact || '').trim();
  if (f.phone   !== undefined) changes.phone   = String(f.phone   || '').trim();
  if (f.email   !== undefined) {
    if (f.email && !validate.isEmail(f.email)) return res.status(400).json({ error: 'Valid email required' });
    changes.email = f.email ? f.email.toLowerCase().trim() : '';
  }
  if (f.type !== undefined) {
    if (!PARTNER_TYPES.includes(f.type)) return res.status(400).json({ error: 'Invalid partner type' });
    changes.type = f.type;
  }
  if (f.status !== undefined) {
    if (!PARTNER_STATUS.includes(f.status)) return res.status(400).json({ error: 'Invalid partner status' });
    changes.status = f.status;
  }
  if (f.trips    !== undefined) changes.trips    = Array.isArray(f.trips) ? f.trips : [];
  if (f.programs !== undefined) changes.programs = Math.max(0, parseInt(f.programs) || 0);
  if (f.revenue  !== undefined) changes.revenue  = Math.max(0, parseInt(f.revenue)  || 0);
  db.partners.update(function(p){ return p.id === req.params.id; }, changes);
  var updated = db.partners.find(function(p){ return p.id === req.params.id; });
  res.json({ partner: updated });
});

router.delete('/partners/:id', auditMod.audit('admin:partner:delete'), function(req, res) {
  var p = db.partners.find(function(x){ return x.id === req.params.id; });
  if (!p) return res.status(404).json({ error: 'Partner not found' });
  db.partners.remove(function(x){ return x.id === req.params.id; });
  res.json({ message: 'Partner deleted', id: req.params.id });
});

/* ── SETTINGS ────────────────────────────────────────────────── */

/* Whitelist of top-level settings keys that are allowed (issue #3) */
var SETTINGS_ALLOWED_KEYS = [
  'settCompanyName', 'settCompanyPhone', 'settCompanyEmail',
  'settCompanyAddr', 'settHours', 'settCompanySite', 'settWhatsappNum',
  'settHeroImg', 'settHeroVideo',
  'settImgGroupe', 'settImgWeekend', 'settImgExpress', 'settImgMesure', 'settImgTeam',
  'cms'
];

router.get('/settings', function(req, res) {
  var s = db.settings.find(function(){ return true; });
  res.json({ settings: s || {} });
});

router.put('/settings', auditMod.audit('admin:settings:update'), function(req, res) {
  var body = req.body || {};

  /* Strip disallowed keys (issue #3) */
  var filtered = {};
  SETTINGS_ALLOWED_KEYS.forEach(function(k) {
    if (body[k] !== undefined) filtered[k] = body[k];
  });

  /* Sanitise CMS HTML fields (issue #13) */
  if (filtered.cms && typeof filtered.cms === 'object') {
    filtered.cms = sanitizeCmsObject(filtered.cms);
  }

  var now = new Date().toISOString();
  var existing = db.settings.find(function(){ return true; });
  if (existing) {
    db.settings.update(function(){ return true; }, Object.assign({}, filtered, { updated: now }));
  } else {
    db.settings.insert(Object.assign({ id: 'main' }, filtered, { created: now, updated: now }));
  }
  var updated = db.settings.find(function(){ return true; });
  res.json({ settings: updated, message: 'Settings saved' });
});

/* ── CMS HTML SANITISER ──────────────────────────────────────── */
var validate2 = require('../middleware/validate');

function sanitizeCmsField(s) {
  if (typeof s !== 'string') return s;
  return validate2.stripDangerousHtml(s);
}

function sanitizeCmsObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) {
    return obj.map(function(item) {
      return typeof item === 'object' ? sanitizeCmsObject(item) : sanitizeCmsField(item);
    });
  }
  var out = {};
  Object.keys(obj).forEach(function(k) {
    var v = obj[k];
    if (typeof v === 'string')   out[k] = sanitizeCmsField(v);
    else if (typeof v === 'object' && v !== null) out[k] = sanitizeCmsObject(v);
    else out[k] = v;
  });
  return out;
}

module.exports = router;
