/**
 * database.js — Pure JS JSON file store (no native compilation needed)
 * Works on Windows / Mac / Linux with any Node version >= 16
 * Data stored in ./data/*.json
 */
const fs   = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Vercel/Lambda deploy to /var/task which is read-only — use /tmp for data
const _serverless = process.env.VERCEL === '1' || __dirname.startsWith('/var/task') || __dirname.startsWith('/var/runtime');
let DATA_DIR = _serverless ? '/tmp/roamers-data' : path.resolve('./data');
try {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
} catch (_mkErr) {
  DATA_DIR = '/tmp/roamers-data';
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function createTable(name) {
  const file = path.join(DATA_DIR, name + '.json');
  function read() { try { return JSON.parse(fs.readFileSync(file,'utf8')); } catch(e) { return []; } }
  function write(rows) { fs.writeFileSync(file, JSON.stringify(rows, null, 2)); }
  return {
    all:    function(fn)  { return fn ? read().filter(fn) : read(); },
    find:   function(fn)  { return read().find(fn) || null; },
    count:  function(fn)  { return fn ? read().filter(fn).length : read().length; },
    sum:    function(key,fn) { return (fn?read().filter(fn):read()).reduce(function(s,r){return s+(Number(r[key])||0);},0); },
    insert: function(doc) { var rows=read(); rows.push(doc); write(rows); return doc; },
    update: function(fn,changes) { write(read().map(function(r){return fn(r)?Object.assign({},r,changes):r;})); },
    remove: function(fn)  { write(read().filter(function(r){return !fn(r);})); }
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

// Seed experiences on first boot
(function() {
  if (db.experiences.count() > 0) return;
  var seed;
  try { seed = require('./data/seed-experiences'); }
  catch (_) { return; }
  if (!Array.isArray(seed) || !seed.length) return;
  var months = ['Janv','Févr','Mars','Avril','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc'];
  function buildDates(seg, id) {
    var list = [];
    var seedNum = 0; for (var i = 0; i < id.length; i++) seedNum += id.charCodeAt(i);
    var startY = 2026, startM = 5;
    var count = seg === 'weekend' ? 5 : seg === 'groupe' ? 4 : seg === 'team' ? 3 : 4;
    for (var i = 0; i < count; i++) {
      var add = seg === 'weekend' ? i * 2 : i * 4;
      var m = startM + add;
      var y = startY + Math.floor((m - 1) / 12);
      var mm = ((m - 1) % 12) + 1;
      var day = ((seedNum + i * 9) % 22) + 5;
      list.push({
        raw: y + '-' + (mm < 10 ? '0' : '') + mm + '-' + (day < 10 ? '0' : '') + day,
        label: day + ' ' + months[mm - 1] + ' ' + y
      });
    }
    return list;
  }
  var now = new Date().toISOString();
  seed.forEach(function(e, i){
    db.experiences.insert({
      id: e.id, segment: e.segment, type: e.type, title: e.title,
      loc: e.loc || '', dur: e.dur || '',
      days: e.days || 1, nights: e.nights || 0,
      price: e.price, pChild: e.pChild || null,
      rating: e.rating || 4.8, rev: e.rev || 0,
      maxP: e.maxP || 20, minP: e.minP || 1,
      badge: e.badge || '',
      tags: e.tags || [],
      img: e.img || '', imgs: e.imgs || [],
      desc: e.desc || '',
      hi: e.hi || [], inc: e.inc || [], exc: e.exc || [],
      it: e.it || [],
      dif: e.dif || 'Facile',
      dates: e.dates || buildDates(e.segment, e.id),
      status: 'open', booked: 0,
      sortOrder: i,
      created: now, updated: now
    });
  });
  console.log('  ✓ Seeded ' + seed.length + ' experiences');
})();

// Seed activities on first boot
(function() {
  if (db.activities.count() > 0) return;
  var { v4: uuidv4 } = require('uuid');
  var now = new Date().toISOString();
  [
    {title:'Camel Trekking at Sunset',category:'adventure',duration:'2h',price:350,status:'active',desc:'Classic Sahara camel experience at golden hour'},
    {title:'Traditional Cooking Class',category:'culture',duration:'3h',price:280,status:'active',desc:'Learn to cook tagine and couscous with a local family'},
    {title:'Outdoor Leadership Workshop',category:'corporate',duration:'4h',price:600,status:'active',desc:'Facilitated team leadership session in nature'},
    {title:'Medina Guided Walk — Fes',category:'culture',duration:'3h',price:200,status:'active',desc:'Expert-led walking tour through Fes el-Bali'},
    {title:'Sandboarding & 4x4 Dune Adventure',category:'adventure',duration:'3h',price:450,status:'active',desc:'Adrenaline-packed dune bashing and sandboarding'},
    {title:'Yoga & Meditation at Sunrise',category:'wellness',duration:'1.5h',price:180,status:'inactive',desc:'Morning wellness session on the Sahara dunes'},
    {title:'CSR Community Service Day',category:'corporate',duration:'8h',price:400,status:'active',desc:'Give back to local Berber communities — team bonding with impact'},
    {title:'Surf Lesson — Taghazout',category:'adventure',duration:'2h',price:320,status:'active',desc:'Beginner-friendly Atlantic surf lesson with certified instructor'}
  ].forEach(function(a){ db.activities.insert(Object.assign({id:uuidv4(), created:now}, a)); });
  console.log('  ✓ Seeded activities');
})();

// Seed admin on first boot
(function() {
  var { v4: uuidv4 } = require('uuid');
  var crypto = require('crypto');
  var adminEmail = process.env.ADMIN_EMAIL || 'admin@roamerscommunity.ma';
  // Deterministic UUID from email so token stays valid across cold starts
  var h = crypto.createHash('sha256').update('admin:' + adminEmail).digest('hex');
  var adminId = h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20,32);
  if (!db.users.find(function(u){ return u.email===adminEmail; })) {
    db.users.insert({
      id: adminId, fname:'Youssef', lname:'El Fassi',
      email: adminEmail,
      password: bcrypt.hashSync(process.env.ADMIN_PASSWORD||'admin123', 10),
      phone:'+212 6 00 00 00 00', country:'Morocco', role:'admin',
      bio:'', joined:new Date().toISOString(), wishlist:[], notifs:[]
    });
    console.log('  ✓ Admin seeded:', adminEmail);
  }
})();

module.exports = db;
