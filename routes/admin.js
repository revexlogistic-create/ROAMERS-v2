const router = require('express').Router();
const db     = require('../database');
const { adminOnly } = require('../middleware/auth');

router.use(adminOnly);

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

router.get('/users', function(req, res) {
  var users = db.users.all().map(function(u){ var x=Object.assign({},u); delete x.password; return x; });
  res.json({ users:users });
});

router.get('/plan-requests', function(req, res) {
  res.json({ requests: db.plans.all().sort(function(a,b){ return new Date(b.created)-new Date(a.created); }) });
});
router.patch('/plan-requests/:id', function(req, res) {
  db.plans.update(function(p){ return p.id===req.params.id; }, { status:req.body.status });
  res.json({ message:'Updated' });
});

router.get('/team-requests', function(req, res) {
  res.json({ requests: db.teams.all().sort(function(a,b){ return new Date(b.created)-new Date(a.created); }) });
});
router.patch('/team-requests/:id', function(req, res) {
  db.teams.update(function(t){ return t.id===req.params.id; }, { status:req.body.status });
  res.json({ message:'Updated' });
});

router.get('/messages', function(req, res) {
  res.json({ messages: db.contacts.all().sort(function(a,b){ return new Date(b.created)-new Date(a.created); }) });
});
router.patch('/messages/:id', function(req, res) {
  db.contacts.update(function(c){ return c.id===req.params.id; }, { status:req.body.status });
  res.json({ message:'Updated' });
});

module.exports = router;
