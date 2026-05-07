const router  = require('express').Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db      = require('../database');
const { auth } = require('../middleware/auth');

const SECRET  = function() { return process.env.JWT_SECRET || 'dev_secret_change_me'; };
const EXPIRES = function() { return process.env.JWT_EXPIRES_IN || '7d'; };

function makeToken(user) { return jwt.sign({ id:user.id, role:user.role }, SECRET(), { expiresIn:EXPIRES() }); }

function sanitize(user) {
  var u = Object.assign({}, user);
  delete u.password;
  if (!Array.isArray(u.wishlist)) u.wishlist = [];
  if (!Array.isArray(u.notifs))   u.notifs   = [];
  return u;
}

router.post('/register', function(req, res) {
  var f = req.body;
  if (!f.fname||!f.lname)       return res.status(400).json({ error:'Full name required' });
  if (!f.email||!f.email.includes('@')) return res.status(400).json({ error:'Valid email required' });
  if (!f.password||f.password.length<6) return res.status(400).json({ error:'Password min 6 characters' });
  if (db.users.find(function(u){ return u.email.toLowerCase()===f.email.toLowerCase(); }))
    return res.status(409).json({ error:'An account with this email already exists' });
  var user = db.users.insert({
    id:uuidv4(), fname:f.fname, lname:f.lname,
    email:f.email, password:bcrypt.hashSync(f.password,10),
    phone:f.phone||'', country:f.country||'Morocco', role:'user',
    bio:'', joined:new Date().toISOString(), wishlist:[], notifs:[]
  });
  res.status(201).json({ token:makeToken(user), user:sanitize(user) });
});

router.post('/login', function(req, res) {
  var f = req.body;
  if (!f.email||!f.password) return res.status(400).json({ error:'Email and password required' });
  var user = db.users.find(function(u){ return u.email.toLowerCase()===f.email.toLowerCase(); });
  if (!user||!bcrypt.compareSync(f.password, user.password))
    return res.status(401).json({ error:'Incorrect email or password' });
  res.json({ token:makeToken(user), user:sanitize(user) });
});

router.get('/me', auth, function(req, res) {
  var user = db.users.find(function(u){ return u.id===req.user.id; });
  res.json({ user:sanitize(user||req.user) });
});

router.put('/profile', auth, function(req, res) {
  var f = req.body;
  if (!f.fname||!f.lname) return res.status(400).json({ error:'Name required' });
  db.users.update(function(u){ return u.id===req.user.id; },
    { fname:f.fname, lname:f.lname, phone:f.phone||'', country:f.country||'Morocco', bio:f.bio||'' });
  var updated = db.users.find(function(u){ return u.id===req.user.id; });
  res.json({ user:sanitize(updated) });
});

router.put('/password', auth, function(req, res) {
  var f = req.body;
  if (!f.current||!f.newPass||f.newPass.length<6) return res.status(400).json({ error:'Invalid password data' });
  if (!bcrypt.compareSync(f.current, req.user.password)) return res.status(401).json({ error:'Current password incorrect' });
  db.users.update(function(u){ return u.id===req.user.id; }, { password:bcrypt.hashSync(f.newPass,10) });
  res.json({ message:'Password updated' });
});

router.post('/wishlist/:expId', auth, function(req, res) {
  var user = db.users.find(function(u){ return u.id===req.user.id; });
  var wl = Array.isArray(user.wishlist) ? user.wishlist.slice() : [];
  var idx = wl.indexOf(req.params.expId);
  if (idx===-1) wl.push(req.params.expId); else wl.splice(idx,1);
  db.users.update(function(u){ return u.id===req.user.id; }, { wishlist:wl });
  res.json({ wishlist:wl });
});

router.delete('/account', auth, function(req, res) {
  if (req.user.role==='admin') return res.status(403).json({ error:'Admin account cannot be deleted' });
  db.users.remove(function(u){ return u.id===req.user.id; });
  res.json({ message:'Account deleted' });
});

module.exports = router;
