/**
 * database.js
 *
 * If MONGODB_URI is set  → MongoDB-backed store with in-memory cache (Vercel / production)
 * Otherwise             → JSON file store (local development)
 *
 * Both backends expose the same synchronous API so route handlers need zero changes:
 *   db.users.find(fn), db.users.insert(doc), db.users.update(fn, changes), …
 *
 * MongoDB mode:
 *   – Call db._init() once at startup (server.js middleware).
 *   – After _init() all reads hit the in-memory cache (fast, synchronous).
 *   – Writes update the cache immediately (synchronous) then flush to MongoDB
 *     asynchronously so the HTTP response is never blocked.
 *   – Flushes are serialised per-collection to avoid races.
 */

const bcrypt = require('bcryptjs');
require('dotenv').config();

/* ──────────────────────────────────────────────────────────
   HELPER: deterministic admin UUID (same across cold starts)
────────────────────────────────────────────────────────── */
function adminUUID(email) {
  const crypto = require('crypto');
  const h = crypto.createHash('sha256').update('admin:' + email).digest('hex');
  return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20,32);
}

/* ══════════════════════════════════════════════════════════
   MONGODB MODE
══════════════════════════════════════════════════════════ */
if (process.env.MONGODB_URI) {

  const { MongoClient } = require('mongodb');

  let _client = null;
  let _mdb    = null;

  async function getMongoDb() {
    if (_mdb) return _mdb;
    _client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
      maxPoolSize: 5
    });
    await _client.connect();
    _mdb = _client.db(process.env.MONGODB_DBNAME || 'roamers');
    return _mdb;
  }

  const TABLES = ['users','bookings','plans','teams','contacts','experiences','activities','partners','settings','itineraries','reviews'];
  const _caches = {};
  TABLES.forEach(function(t){ _caches[t] = []; });

  /* Serialised per-collection flush to avoid races */
  const _flushChain = {};
  TABLES.forEach(function(t){ _flushChain[t] = Promise.resolve(); });

  function scheduleFlush(name) {
    _flushChain[name] = _flushChain[name].then(async function() {
      try {
        const mdb  = await getMongoDb();
        const col  = mdb.collection(name);
        const docs = (_caches[name] || []).map(function(d){
          const x = Object.assign({}, d); delete x._id; return x;
        });
        await col.deleteMany({});
        if (docs.length) await col.insertMany(docs);
      } catch(err) {
        console.error('[DB] flush error ('+name+'):', err.message);
      }
    });
  }

  function makeTable(name) {
    return {
      all:    function(fn)    { const c=_caches[name]; return fn?c.filter(fn):c.slice(); },
      find:   function(fn)    { return _caches[name].find(fn)||null; },
      count:  function(fn)    { const c=_caches[name]; return fn?c.filter(fn).length:c.length; },
      sum:    function(key,fn){ const c=_caches[name]; return (fn?c.filter(fn):c).reduce(function(s,r){return s+(Number(r[key])||0);},0); },
      insert: function(doc)   { _caches[name].push(doc); scheduleFlush(name); return doc; },
      update: function(fn,ch) { _caches[name].forEach(function(r,i){ if(fn(r)) _caches[name][i]=Object.assign({},r,ch); }); scheduleFlush(name); },
      remove: function(fn)    { _caches[name]=_caches[name].filter(function(r){return !fn(r);}); scheduleFlush(name); },
      /* Await the pending MongoDB flush — call this before res.json() in write routes */
      flush:  function()      { return _flushChain[name] || Promise.resolve(); }
    };
  }

  const db = {
    users:       makeTable('users'),
    bookings:    makeTable('bookings'),
    plans:       makeTable('plans'),
    teams:       makeTable('teams'),
    contacts:    makeTable('contacts'),
    experiences: makeTable('experiences'),
    activities:  makeTable('activities'),
    partners:    makeTable('partners'),
    settings:    makeTable('settings'),
    itineraries: makeTable('itineraries'),
    reviews:     makeTable('reviews')
  };

  /* Called once by server.js before accepting requests */
  db._init = async function() {
    const mdb = await getMongoDb();
    await Promise.all(TABLES.map(async function(name) {
      const docs = await mdb.collection(name).find({}, {projection:{_id:0}}).toArray();
      _caches[name] = docs;
    }));
    /* One-time migration: wipe demo seed data so Roamers can populate real content */
    if (!db.settings.find(function(s){ return s.key === 'v3_seed_cleared'; })) {
      _caches['activities']  = [];
      _caches['experiences'] = [];
      /* Await the direct MongoDB deletes so the data is gone before we set the flag */
      await mdb.collection('activities').deleteMany({});
      await mdb.collection('experiences').deleteMany({});
      db.settings.insert({ key: 'v3_seed_cleared', value: true, ts: new Date().toISOString() });
      await db.settings.flush();
      console.log('  ✓ Demo seed data cleared from MongoDB');
    }
    _seedAdmin(db);
    console.log('  ✓ DB ready (MongoDB)');
  };

  module.exports = db;

/* ══════════════════════════════════════════════════════════
   FILE MODE (local development)
══════════════════════════════════════════════════════════ */
} else {

  const fs   = require('fs');
  const path = require('path');

  const _serverless = process.env.VERCEL==='1' || __dirname.startsWith('/var/task');
  let DATA_DIR = _serverless ? '/tmp/roamers-data' : path.resolve('./data');
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true}); }
  catch(_){ DATA_DIR='/tmp/roamers-data'; if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true}); }

  function createTable(name) {
    const file = path.join(DATA_DIR, name+'.json');
    function read(){ try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){return [];} }
    function write(rows){ fs.writeFileSync(file, JSON.stringify(rows,null,2)); }
    return {
      all:    function(fn)    { return fn?read().filter(fn):read(); },
      find:   function(fn)    { return read().find(fn)||null; },
      count:  function(fn)    { const c=read(); return fn?c.filter(fn).length:c.length; },
      sum:    function(key,fn){ const c=read(); return (fn?c.filter(fn):c).reduce(function(s,r){return s+(Number(r[key])||0);},0); },
      insert: function(doc)   { const rows=read(); rows.push(doc); write(rows); return doc; },
      update: function(fn,ch) { write(read().map(function(r){return fn(r)?Object.assign({},r,ch):r;})); },
      remove: function(fn)    { write(read().filter(function(r){return !fn(r);})); },
      flush:  function()      { return Promise.resolve(); }
    };
  }

  const db = {
    users:       createTable('users'),
    bookings:    createTable('bookings'),
    plans:       createTable('plans'),
    teams:       createTable('teams'),
    contacts:    createTable('contacts'),
    experiences: createTable('experiences'),
    activities:  createTable('activities'),
    partners:    createTable('partners'),
    settings:    createTable('settings'),
    itineraries: createTable('itineraries'),
    reviews:     createTable('reviews')
  };

  db._init = async function(){ /* no-op for file mode */ };

  _seedAdmin(db);

  module.exports = db;
}

/* ══════════════════════════════════════════════════════════
   SEED FUNCTIONS (shared by both modes)
══════════════════════════════════════════════════════════ */
function _seedAdmin(db) {
  var adminEmail    = process.env.ADMIN_EMAIL    || 'admin@roamerscommunity.ma';
  var adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error('\n  FATAL: ADMIN_PASSWORD environment variable is not set.\n  Set it in your .env file.\n');
    process.exit(1);
  }
  if (!db.users.find(function(u){ return u.email===adminEmail; })) {
    db.users.insert({
      id: adminUUID(adminEmail),
      fname:'Youssef', lname:'El Fassi', email:adminEmail,
      password:     bcrypt.hashSync(adminPassword, 12),
      phone:'+212 6 00 00 00 00', country:'Morocco', role:'admin',
      bio:'', joined:new Date().toISOString(), wishlist:[], notifs:[],
      tokenVersion: 0,
      loginFailCount: 0, loginLockUntil: null
    });
    console.log('  ✓ Admin seeded:', adminEmail);
  }
}
