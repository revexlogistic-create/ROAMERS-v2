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

  const { MongoClient, ObjectId } = require('mongodb');

  let _client = null;
  let _mdb    = null;

  async function getMongoDb() {
    if (_mdb) return _mdb;
    _client = new MongoClient(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 3,       /* stay within Atlas M0 connection limit */
      minPoolSize: 0,       /* don't keep idle connections in serverless */
      maxIdleTimeMS: 20000  /* close connections idle > 20 s */
    });
    await _client.connect();
    _mdb = _client.db(process.env.MONGODB_DBNAME || 'roamers');
    return _mdb;
  }

  const TABLES = ['users','pending','bookings','plans','teams','contacts','experiences','activities','events','partners','settings','itineraries','reviews','pushTokens','notifications','promos'];
  const _caches   = {};
  const _loadedAt = {};   /* when this instance last loaded each collection */
  const _pending  = {};   /* queued per-document bulkWrite ops per collection */
  const _flushChain = {};
  const _lastFlush  = {};
  TABLES.forEach(function(t){
    _caches[t]     = [];
    _loadedAt[t]   = 0;
    _pending[t]    = [];
    _flushChain[t] = Promise.resolve();
    _lastFlush[t]  = Promise.resolve();
  });

  /* Load a collection's documents into the in-memory cache (keeps Mongo _id). */
  async function loadCollection(name) {
    const mdb = await getMongoDb();
    _caches[name]   = await mdb.collection(name).find({}).toArray();
    _loadedAt[name] = Date.now();
  }

  /* Remove the internal Mongo _id before handing a document to callers, so it
     never leaks into API responses or gets echoed back into an update. */
  function stripId(d){ if (!d) return d; const x = Object.assign({}, d); delete x._id; return x; }

  /*
   * Flush queued PER-DOCUMENT operations (insert/update/delete of only the
   * changed records). Critically, this never rewrites the whole collection, so
   * a stale serverless instance can no longer overwrite another instance's data.
   * Exposed _lastFlush[name] rejects on write failure so callers can return 503.
   */
  function scheduleFlush(name) {
    if (!_pending[name].length) return;
    const ops = _pending[name];
    _pending[name] = [];
    const work = _flushChain[name]
      .catch(function(){})
      .then(async function() {
        if (!ops.length) return;
        const mdb = await getMongoDb();
        await mdb.collection(name).bulkWrite(ops, { ordered: false });
      });
    _flushChain[name] = work.catch(function(err){
      console.error('[DB] flush error ('+name+'):', err.message);
    });
    _lastFlush[name] = work;
  }

  function makeTable(name) {
    return {
      all:    function(fn)    { const c=_caches[name]; return (fn?c.filter(fn):c.slice()).map(stripId); },
      find:   function(fn)    { const r=_caches[name].find(fn); return r?stripId(r):null; },
      count:  function(fn)    { const c=_caches[name]; return fn?c.filter(fn).length:c.length; },
      sum:    function(key,fn){ const c=_caches[name]; return (fn?c.filter(fn):c).reduce(function(s,r){return s+(Number(r[key])||0);},0); },
      insert: function(doc)   {
        const rec = Object.assign({}, doc, { _id: new ObjectId() });
        _caches[name].push(rec);
        _pending[name].push({ insertOne: { document: rec } });
        scheduleFlush(name);
        return stripId(rec);
      },
      update: function(fn,ch) {
        _caches[name].forEach(function(r,i){
          if (fn(r)) {
            _caches[name][i] = Object.assign({}, r, ch);            /* preserves _id */
            _pending[name].push({ updateOne: { filter: { _id: r._id }, update: { $set: ch } } });
          }
        });
        scheduleFlush(name);
      },
      remove: function(fn)    {
        const kept = [];
        _caches[name].forEach(function(r){
          if (fn(r)) _pending[name].push({ deleteOne: { filter: { _id: r._id } } });
          else kept.push(r);
        });
        _caches[name] = kept;
        scheduleFlush(name);
      },
      /* Await the pending MongoDB write — may reject on DB failure */
      flush:  function()      { return _lastFlush[name] || Promise.resolve(); }
    };
  }

  const db = {
    users:         makeTable('users'),
    pending:       makeTable('pending'),
    bookings:      makeTable('bookings'),
    plans:         makeTable('plans'),
    teams:         makeTable('teams'),
    contacts:      makeTable('contacts'),
    experiences:   makeTable('experiences'),
    activities:    makeTable('activities'),
    events:        makeTable('events'),
    partners:      makeTable('partners'),
    settings:      makeTable('settings'),
    itineraries:   makeTable('itineraries'),
    reviews:       makeTable('reviews'),
    pushTokens:    makeTable('pushTokens'),
    notifications: makeTable('notifications'),
    promos:        makeTable('promos')
  };

  /* Called once by server.js before accepting requests */
  db._init = async function() {
    await Promise.all(TABLES.map(function(name){ return loadCollection(name); }));
    /* One-time migration: wipe demo seed data so Roamers can populate real content */
    if (!db.settings.find(function(s){ return s.key === 'v3_seed_cleared'; })) {
      const mdb = await getMongoDb();
      await mdb.collection('activities').deleteMany({});
      await mdb.collection('experiences').deleteMany({});
      _caches['activities']  = [];
      _caches['experiences'] = [];
      db.settings.insert({ key: 'v3_seed_cleared', value: true, ts: new Date().toISOString() });
      await db.settings.flush();
      console.log('  ✓ Demo seed data cleared from MongoDB');
    }
    /* One-time cleanup: remove duplicate records that share the same `id`
       (the previous whole-collection-overwrite layer created duplicate admin
       rows across serverless instances). Real users have unique ids and are
       never touched — only same-id duplicates are removed, keeping the first. */
    if (!db.settings.find(function(s){ return s.key === 'users_deduped_v1'; })) {
      const mdb2 = await getMongoDb();
      const seenIds = {};
      const dupMongoIds = [];
      _caches['users'].forEach(function(u){
        if (!u.id) return;
        if (seenIds[u.id]) dupMongoIds.push(u._id);
        else seenIds[u.id] = true;
      });
      if (dupMongoIds.length) {
        await mdb2.collection('users').deleteMany({ _id: { $in: dupMongoIds } });
        const kept = {};
        _caches['users'] = _caches['users'].filter(function(u){
          if (!u.id) return true;
          if (kept[u.id]) return false;
          kept[u.id] = true; return true;
        });
      }
      db.settings.insert({ key: 'users_deduped_v1', value: true, removed: dupMongoIds.length, ts: new Date().toISOString() });
      await db.settings.flush();
      console.log('  ✓ Deduped users — removed ' + dupMongoIds.length + ' duplicate record(s)');
    }
    _seedAdmin(db);
    await db.users.flush();
    console.log('  ✓ DB ready (MongoDB, per-document writes)');
  };

  /* Reload collections whose cache is older than maxAgeMs so reads converge
     across serverless instances. Awaits pending writes first so a just-saved
     record is never dropped from the cache. Called from a per-request middleware. */
  db._refresh = async function(names, maxAgeMs) {
    maxAgeMs = (maxAgeMs == null) ? 4000 : maxAgeMs;
    const now  = Date.now();
    const list = (names && names.length) ? names : TABLES;
    await Promise.all(list.map(async function(name){
      if (now - (_loadedAt[name] || 0) < maxAgeMs) return;
      _loadedAt[name] = now;   /* claim the slot up-front to avoid a reload stampede */
      try { await (_lastFlush[name] || Promise.resolve()); } catch(e){}
      try { await loadCollection(name); }
      catch(e){ console.error('[DB] refresh error ('+name+'):', e.message); }
    }));
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
  const SEED_DIR = path.resolve(__dirname, 'data'); // committed seed files
  try { if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true}); }
  catch(_){ DATA_DIR='/tmp/roamers-data'; if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true}); }

  function createTable(name) {
    const file     = path.join(DATA_DIR, name+'.json');
    const seedFile = path.join(SEED_DIR, name+'.json');
    function read(){
      /* Primary: writable /tmp copy */
      try{ if(fs.existsSync(file)) return JSON.parse(fs.readFileSync(file,'utf8')); }catch(e){}
      /* Fallback: committed seed file (always present after deploy) */
      try{ if(fs.existsSync(seedFile)) return JSON.parse(fs.readFileSync(seedFile,'utf8')); }catch(e){}
      return [];
    }
    function write(rows){ try{ fs.writeFileSync(file, JSON.stringify(rows,null,2)); }catch(e){} }
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
    users:         createTable('users'),
    pending:       createTable('pending'),
    bookings:      createTable('bookings'),
    plans:         createTable('plans'),
    teams:         createTable('teams'),
    contacts:      createTable('contacts'),
    experiences:   createTable('experiences'),
    activities:    createTable('activities'),
    events:        createTable('events'),
    partners:      createTable('partners'),
    settings:      createTable('settings'),
    itineraries:   createTable('itineraries'),
    reviews:       createTable('reviews'),
    pushTokens:    createTable('pushTokens'),
    notifications: createTable('notifications'),
    promos:        createTable('promos')
  };

  db._init    = async function(){ /* no-op for file mode */ };
  db._refresh = async function(){ /* no-op for file mode — single process */ };

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
  var hash = bcrypt.hashSync(adminPassword, 12);
  var existing = db.users.find(function(u){ return u.email===adminEmail; });
  if (!existing) {
    db.users.insert({
      id: adminUUID(adminEmail),
      fname:'Youssef', lname:'El Fassi', email:adminEmail,
      password: hash,
      phone:'+212 6 00 00 00 00', country:'Morocco', role:'admin',
      bio:'', joined:new Date().toISOString(), wishlist:[], notifs:[],
      tokenVersion: 0,
      loginFailCount: 0, loginLockUntil: null
    });
    console.log('  ✓ Admin seeded:', adminEmail);
  } else {
    /* Always sync password from env var so committed users.json hash never blocks login */
    db.users.update(function(u){ return u.email===adminEmail; }, { password: hash, loginFailCount: 0, loginLockUntil: null });
  }
}
