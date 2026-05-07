const router  = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt  = require('bcryptjs');
const db      = require('../database');
const { adminOnly } = require('../middleware/auth');

router.use(adminOnly);

/* ── STATS ─────────────────────────────────────── */
router.get('/stats', function(req, res) {
  res.json({
    totalBookings: db.bookings.count(),
    totalRevenue:  db.bookings.sum('total', function(b){ return b.status!=='cancelled'; }),
    pendingBk:     db.bookings.count(function(b){ return b.status==='pending'; }),
    totalUsers:    db.users.count(function(u){ return u.role==='user'; }),
    newPlanReqs:   db.plans.count(function(p){ return p.status==='new'; }),
    newTeamReqs:   db.teams.count(function(t){ return t.status==='new'; }),
    newMessages:   db.contacts.count(function(c){ return c.status==='unread'; })
  });
});

/* ── BOOKINGS ───────────────────────────────────── */
router.get('/bookings', function(req, res) {
  var list = db.bookings.all().sort(function(a,b){ return new Date(b.created)-new Date(a.created); });
  res.json({ bookings:list, total:list.length });
});

router.patch('/bookings/:id', function(req, res) {
  db.bookings.update(function(b){ return b.id===req.params.id; }, req.body);
  res.json({ message:'Updated' });
});

router.delete('/bookings/:id', function(req, res) {
  var bk = db.bookings.find(function(b){ return b.id===req.params.id; });
  if (!bk) return res.status(404).json({ error:'Booking not found' });
  db.bookings.remove(function(b){ return b.id===req.params.id; });
  res.json({ message:'Booking deleted', id:req.params.id });
});

/* ── USERS ──────────────────────────────────────── */
router.get('/users', function(req, res) {
  var users = db.users.all().map(function(u){ var x=Object.assign({},u); delete x.password; return x; });
  res.json({ users:users });
});

router.post('/team', function(req, res) {
  var f = req.body;
  if (!f.fname || !f.email) return res.status(400).json({ error:'First name and email required' });
  if (db.users.find(function(u){ return u.email===f.email; })) return res.status(400).json({ error:'Email already exists' });
  var password = f.password || 'Roamers2024!';
  var user = db.users.insert({
    id: uuidv4(), fname:f.fname, lname:f.lname||'',
    email: f.email,
    password: bcrypt.hashSync(password, 10),
    phone: f.phone||'', country: f.country||'Morocco',
    role: f.role||'editor',
    bio:'', joined:new Date().toISOString(), wishlist:[], notifs:[]
  });
  var out = Object.assign({}, user); delete out.password;
  res.status(201).json({ message:'User created', user:out });
});

router.patch('/team/:id', function(req, res) {
  var f = req.body;
  var user = db.users.find(function(u){ return u.id===req.params.id; });
  if (!user) return res.status(404).json({ error:'User not found' });
  var changes = {};
  if (f.fname !== undefined) changes.fname = f.fname;
  if (f.lname !== undefined) changes.lname = f.lname;
  if (f.email !== undefined) changes.email = f.email;
  if (f.role  !== undefined) changes.role  = f.role;
  if (f.phone !== undefined) changes.phone = f.phone;
  if (Object.keys(changes).length) db.users.update(function(u){ return u.id===req.params.id; }, changes);
  res.json({ message:'User updated' });
});

router.delete('/team/:id', function(req, res) {
  var user = db.users.find(function(u){ return u.id===req.params.id; });
  if (!user) return res.status(404).json({ error:'User not found' });
  if (user.role === 'admin') {
    var adminCount = db.users.count(function(u){ return u.role==='admin'; });
    if (adminCount <= 1) return res.status(400).json({ error:'Cannot delete the last admin' });
  }
  db.users.remove(function(u){ return u.id===req.params.id; });
  res.json({ message:'User deleted', id:req.params.id });
});

/* ── PLAN REQUESTS ──────────────────────────────── */
router.get('/plan-requests', function(req, res) {
  res.json({ requests: db.plans.all().sort(function(a,b){ return new Date(b.created)-new Date(a.created); }) });
});
router.patch('/plan-requests/:id', function(req, res) {
  db.plans.update(function(p){ return p.id===req.params.id; }, { status:req.body.status });
  res.json({ message:'Updated' });
});

/* ── TEAM BUILDING REQUESTS ─────────────────────── */
router.get('/team-requests', function(req, res) {
  res.json({ requests: db.teams.all().sort(function(a,b){ return new Date(b.created)-new Date(a.created); }) });
});
router.patch('/team-requests/:id', function(req, res) {
  db.teams.update(function(t){ return t.id===req.params.id; }, { status:req.body.status });
  res.json({ message:'Updated' });
});

/* ── MESSAGES (contacts) ────────────────────────── */
router.get('/messages', function(req, res) {
  res.json({ messages: db.contacts.all().sort(function(a,b){ return new Date(b.created)-new Date(a.created); }) });
});
router.patch('/messages/:id', function(req, res) {
  db.contacts.update(function(c){ return c.id===req.params.id; }, { status:req.body.status });
  res.json({ message:'Updated' });
});
router.delete('/messages/:id', function(req, res) {
  var msg = db.contacts.find(function(c){ return c.id===req.params.id; });
  if (!msg) return res.status(404).json({ error:'Message not found' });
  db.contacts.remove(function(c){ return c.id===req.params.id; });
  res.json({ message:'Message deleted', id:req.params.id });
});

/* ── ACTIVITIES ─────────────────────────────────── */
router.get('/activities', function(req, res) {
  res.json({ activities: db.activities.all().sort(function(a,b){ return new Date(a.created)-new Date(b.created); }) });
});

router.post('/activities', function(req, res) {
  var f = req.body;
  if (!f.title) return res.status(400).json({ error:'Title required' });
  var now = new Date().toISOString();
  var doc = db.activities.insert({
    id: uuidv4(), title:f.title,
    category: f.category||'adventure',
    duration: f.duration||'',
    price:    parseInt(f.price)||0,
    status:   f.status||'active',
    desc:     f.desc||'',
    created:  now, updated: now
  });
  res.status(201).json({ activity:doc });
});

router.put('/activities/:id', function(req, res) {
  var existing = db.activities.find(function(a){ return a.id===req.params.id; });
  if (!existing) return res.status(404).json({ error:'Activity not found' });
  var f = req.body;
  var changes = { updated: new Date().toISOString() };
  if (f.title    !== undefined) changes.title    = f.title;
  if (f.category !== undefined) changes.category = f.category;
  if (f.duration !== undefined) changes.duration = f.duration;
  if (f.price    !== undefined) changes.price    = parseInt(f.price)||0;
  if (f.status   !== undefined) changes.status   = f.status;
  if (f.desc     !== undefined) changes.desc     = f.desc;
  db.activities.update(function(a){ return a.id===req.params.id; }, changes);
  var updated = db.activities.find(function(a){ return a.id===req.params.id; });
  res.json({ activity:updated });
});

router.delete('/activities/:id', function(req, res) {
  var a = db.activities.find(function(x){ return x.id===req.params.id; });
  if (!a) return res.status(404).json({ error:'Activity not found' });
  db.activities.remove(function(x){ return x.id===req.params.id; });
  res.json({ message:'Activity deleted', id:req.params.id });
});

/* ── PARTNERS ───────────────────────────────────── */
router.get('/partners', function(req, res) {
  res.json({ partners: db.partners.all().sort(function(a,b){ return new Date(a.created)-new Date(b.created); }) });
});

router.post('/partners', function(req, res) {
  var f = req.body;
  if (!f.name) return res.status(400).json({ error:'Partner name required' });
  var now = new Date().toISOString();
  var doc = db.partners.insert({
    id:       uuidv4(), name:f.name,
    country:  f.country||'',
    type:     f.type||'Tour Operator',
    contact:  f.contact||'',
    email:    f.email||'',
    phone:    f.phone||'',
    status:   f.status||'active',
    trips:    f.trips||[],
    programs: parseInt(f.programs)||0,
    revenue:  parseInt(f.revenue)||0,
    created:  now, updated: now
  });
  res.status(201).json({ partner:doc });
});

router.put('/partners/:id', function(req, res) {
  var existing = db.partners.find(function(p){ return p.id===req.params.id; });
  if (!existing) return res.status(404).json({ error:'Partner not found' });
  var f = req.body;
  var changes = { updated: new Date().toISOString() };
  if (f.name    !== undefined) changes.name    = f.name;
  if (f.country !== undefined) changes.country = f.country;
  if (f.type    !== undefined) changes.type    = f.type;
  if (f.contact !== undefined) changes.contact = f.contact;
  if (f.email   !== undefined) changes.email   = f.email;
  if (f.phone   !== undefined) changes.phone   = f.phone;
  if (f.status  !== undefined) changes.status  = f.status;
  if (f.trips   !== undefined) changes.trips   = f.trips;
  if (f.programs!== undefined) changes.programs= parseInt(f.programs)||0;
  if (f.revenue !== undefined) changes.revenue = parseInt(f.revenue)||0;
  db.partners.update(function(p){ return p.id===req.params.id; }, changes);
  var updated = db.partners.find(function(p){ return p.id===req.params.id; });
  res.json({ partner:updated });
});

router.delete('/partners/:id', function(req, res) {
  var p = db.partners.find(function(x){ return x.id===req.params.id; });
  if (!p) return res.status(404).json({ error:'Partner not found' });
  db.partners.remove(function(x){ return x.id===req.params.id; });
  res.json({ message:'Partner deleted', id:req.params.id });
});

/* ── SETTINGS ───────────────────────────────────── */
router.get('/settings', function(req, res) {
  var s = db.settings.find(function(){ return true; });
  res.json({ settings: s || {} });
});

router.put('/settings', function(req, res) {
  var existing = db.settings.find(function(){ return true; });
  var now = new Date().toISOString();
  if (existing) {
    db.settings.update(function(){ return true; }, Object.assign({}, req.body, { updated:now }));
  } else {
    db.settings.insert(Object.assign({ id:'main' }, req.body, { created:now, updated:now }));
  }
  var updated = db.settings.find(function(){ return true; });
  res.json({ settings:updated, message:'Settings saved' });
});

module.exports = router;
