/**
 * database.js — Pure JS JSON file store (no native compilation needed)
 * Works on Windows / Mac / Linux with any Node version >= 16
 * Data stored in ./data/*.json
 */
const fs   = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// On Vercel the project root is read-only; write runtime data to /tmp instead
const DATA_DIR = process.env.VERCEL ? '/tmp/roamers-data' : path.resolve('./data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

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
  experiences: createTable('experiences')
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

// Seed admin on first boot
(function() {
  var { v4: uuidv4 } = require('uuid');
  var adminEmail = process.env.ADMIN_EMAIL || 'admin@roamerscommunity.ma';
  if (!db.users.find(function(u){ return u.email===adminEmail; })) {
    db.users.insert({
      id: uuidv4(), fname:'Youssef', lname:'El Fassi',
      email: adminEmail,
      password: bcrypt.hashSync(process.env.ADMIN_PASSWORD||'admin123', 10),
      phone:'+212 6 00 00 00 00', country:'Morocco', role:'admin',
      bio:'', joined:new Date().toISOString(), wishlist:[], notifs:[]
    });
    console.log('  ✓ Admin seeded:', adminEmail);
  }
})();

module.exports = db;
