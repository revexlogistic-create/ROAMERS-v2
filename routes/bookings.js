const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db     = require('../database');
const { auth, optionalAuth } = require('../middleware/auth');
const mailer = require('../mailer');

router.post('/', optionalAuth, function(req, res) {
  var f = req.body;
  if (!f.expId||!f.expTitle||!f.date||!f.name||!f.email||!f.phone||!f.total)
    return res.status(400).json({ error:'Missing required fields' });
  var id = 'RC-'+Math.random().toString(36).substr(2,4).toUpperCase()+Date.now().toString().slice(-4);
  var booking = db.bookings.insert({
    id:id, userId:req.user?req.user.id:null,
    expId:f.expId, expTitle:f.expTitle, expImg:f.expImg||'', expLoc:f.expLoc||'',
    duration:f.duration||'', segment:f.segment||'', type:f.type||'',
    date:f.date, adults:parseInt(f.adults)||1, children:parseInt(f.children)||0,
    addons:f.addons||{}, notes:f.notes||'',
    name:f.name, email:f.email, phone:f.phone, country:f.country||'Morocco',
    total:parseFloat(f.total), status:'pending', payment:'unpaid',
    created:new Date().toISOString()
  });
  mailer.sendBookingConfirmation(booking).catch(function(){});
  res.status(201).json({ booking:booking, ref:id });
});

router.get('/', auth, function(req, res) {
  var bookings = db.bookings.all(function(b){ return b.userId===req.user.id||b.email===req.user.email; });
  bookings.sort(function(a,b){ return new Date(b.created)-new Date(a.created); });
  res.json({ bookings:bookings });
});

router.get('/:id', optionalAuth, function(req, res) {
  var b = db.bookings.find(function(x){ return x.id===req.params.id; });
  if (!b) return res.status(404).json({ error:'Booking not found' });
  if (req.user&&(req.user.id===b.userId||req.user.email===b.email||req.user.role==='admin'))
    return res.json({ booking:b });
  res.status(403).json({ error:'Access denied' });
});

router.patch('/:id/cancel', auth, function(req, res) {
  var b = db.bookings.find(function(x){ return x.id===req.params.id; });
  if (!b) return res.status(404).json({ error:'Not found' });
  if (b.userId!==req.user.id&&req.user.role!=='admin') return res.status(403).json({ error:'Access denied' });
  db.bookings.update(function(x){ return x.id===req.params.id; }, { status:'cancelled' });
  res.json({ message:'Booking cancelled' });
});

module.exports = router;
