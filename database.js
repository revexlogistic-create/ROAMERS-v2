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

  const TABLES = ['users','bookings','plans','teams','contacts','experiences','activities','partners','settings'];
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
      remove: function(fn)    { _caches[name]=_caches[name].filter(function(r){return !fn(r);}); scheduleFlush(name); }
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
    settings:    makeTable('settings')
  };

  /* Called once by server.js before accepting requests */
  db._init = async function() {
    const mdb = await getMongoDb();
    await Promise.all(TABLES.map(async function(name) {
      const docs = await mdb.collection(name).find({}, {projection:{_id:0}}).toArray();
      _caches[name] = docs;
    }));
    _seedExperiences(db);
    _seedActivities(db);
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
      remove: function(fn)    { write(read().filter(function(r){return !fn(r);})); }
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
    settings:    createTable('settings')
  };

  db._init = async function(){ /* no-op for file mode */ };

  _seedExperiences(db);
  _seedActivities(db);
  _seedAdmin(db);

  module.exports = db;
}

/* ══════════════════════════════════════════════════════════
   SEED FUNCTIONS (shared by both modes)
══════════════════════════════════════════════════════════ */
function _seedExperiences(db) {
  if (db.experiences.count() > 0) return;
  var seed;
  try { seed = require('./data/seed-experiences'); } catch(_){ return; }
  if (!Array.isArray(seed) || !seed.length) return;
  var months = ['Janv','Févr','Mars','Avril','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc'];
  function buildDates(seg, id) {
    var list = [], seedNum = 0;
    for (var i=0;i<id.length;i++) seedNum+=id.charCodeAt(i);
    var startY=2026, startM=5;
    var count = seg==='weekend'?5:seg==='groupe'?4:seg==='team'?3:4;
    for (var i=0;i<count;i++) {
      var add=seg==='weekend'?i*2:i*4, m=startM+add;
      var y=startY+Math.floor((m-1)/12), mm=((m-1)%12)+1;
      var day=((seedNum+i*9)%22)+5;
      list.push({raw:y+'-'+(mm<10?'0':'')+mm+'-'+(day<10?'0':'')+day, label:day+' '+months[mm-1]+' '+y});
    }
    return list;
  }
  var now = new Date().toISOString();
  seed.forEach(function(e,i){
    db.experiences.insert({
      id:e.id, segment:e.segment, type:e.type, title:e.title, loc:e.loc||'', dur:e.dur||'',
      days:e.days||1, nights:e.nights||0, price:e.price, pChild:e.pChild||null,
      rating:e.rating||4.8, rev:e.rev||0, maxP:e.maxP||20, minP:e.minP||1,
      badge:e.badge||'', tags:e.tags||[], img:e.img||'', imgs:e.imgs||[],
      desc:e.desc||'', hi:e.hi||[], inc:e.inc||[], exc:e.exc||[], it:e.it||[],
      dif:e.dif||'Facile', dates:e.dates||buildDates(e.segment,e.id),
      status:'open', booked:0, sortOrder:i, created:now, updated:now
    });
  });
  console.log('  ✓ Seeded '+seed.length+' experiences');
}

function _seedActivities(db) {
  if (db.activities.count() > 0) return;
  var { v4: uuidv4 } = require('uuid');
  var now = new Date().toISOString();
  [
    {title:'Camel Trekking at Sunset',    category:'adventure', duration:'2h',   price:350, status:'active',   desc:'Classic Sahara camel experience at golden hour'},
    {title:'Traditional Cooking Class',   category:'culture',   duration:'3h',   price:280, status:'active',   desc:'Learn to cook tagine and couscous with a local family'},
    {title:'Outdoor Leadership Workshop', category:'corporate', duration:'4h',   price:600, status:'active',   desc:'Facilitated team leadership session in nature'},
    {title:'Medina Guided Walk — Fes',    category:'culture',   duration:'3h',   price:200, status:'active',   desc:'Expert-led walking tour through Fes el-Bali'},
    {title:'Sandboarding & 4x4 Dune',     category:'adventure', duration:'3h',   price:450, status:'active',   desc:'Adrenaline-packed dune bashing and sandboarding'},
    {title:'Yoga & Meditation at Sunrise',category:'wellness',  duration:'1.5h', price:180, status:'inactive', desc:'Morning wellness session on the Sahara dunes'},
    {title:'CSR Community Service Day',   category:'corporate', duration:'8h',   price:400, status:'active',   desc:'Give back to local Berber communities'},
    {title:'Surf Lesson — Taghazout',     category:'adventure', duration:'2h',   price:320, status:'active',   desc:'Beginner-friendly Atlantic surf lesson'}
  ].forEach(function(a){ db.activities.insert(Object.assign({id:uuidv4(), created:now}, a)); });
  console.log('  ✓ Seeded activities');
}

function _seedAdmin(db) {
  var adminEmail = process.env.ADMIN_EMAIL || 'admin@roamerscommunity.ma';
  if (!db.users.find(function(u){ return u.email===adminEmail; })) {
    db.users.insert({
      id: adminUUID(adminEmail),
      fname:'Youssef', lname:'El Fassi', email:adminEmail,
      password: bcrypt.hashSync(process.env.ADMIN_PASSWORD||'admin123', 10),
      phone:'+212 6 00 00 00 00', country:'Morocco', role:'admin',
      bio:'', joined:new Date().toISOString(), wishlist:[], notifs:[]
    });
    console.log('  ✓ Admin seeded:', adminEmail);
  }
}
