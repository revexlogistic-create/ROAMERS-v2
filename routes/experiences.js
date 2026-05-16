/**
 * routes/experiences.js
 * Public read access + admin-only create/update/delete for the travel catalog.
 */
const router = require('express').Router();
const db     = require('../database');
const { adminOnly } = require('../middleware/auth');

const ALLOWED_SEGMENTS = ['groupe','weekend','express','team','mesure'];
const ALLOWED_TYPES    = ['desert','mountain','coastal','cultural'];
const ALLOWED_STATUS   = ['open','closed','full','draft'];
const ALLOWED_DIFF     = ['Facile','Modéré','Sportif','Extrême'];

function slugify(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'exp-' + Date.now().toString(36).slice(-5);
}

function uniqueId(base) {
  let id = base; let n = 1;
  while (db.experiences.find(function(e){ return e.id === id; })) {
    id = base + '-' + (++n);
  }
  return id;
}

function asArray(v) { return Array.isArray(v) ? v : (v == null || v === '' ? [] : [v]); }

function validateBody(b, partial) {
  const errors = [];
  if (!partial || b.segment !== undefined) {
    if (!ALLOWED_SEGMENTS.includes(b.segment)) errors.push('segment must be one of: ' + ALLOWED_SEGMENTS.join(', '));
  }
  if (!partial || b.type !== undefined) {
    if (!ALLOWED_TYPES.includes(b.type)) errors.push('type must be one of: ' + ALLOWED_TYPES.join(', '));
  }
  if (!partial || b.title !== undefined) {
    if (!b.title || !String(b.title).trim()) errors.push('title is required');
  }
  if (!partial || b.price !== undefined) {
    const p = Number(b.price);
    if (!Number.isFinite(p) || p <= 0) errors.push('price must be a positive number');
  }
  if (b.dif !== undefined && b.dif && !ALLOWED_DIFF.includes(b.dif)) {
    errors.push('dif must be one of: ' + ALLOWED_DIFF.join(', '));
  }
  if (b.status !== undefined && b.status && !ALLOWED_STATUS.includes(b.status)) {
    errors.push('status must be one of: ' + ALLOWED_STATUS.join(', '));
  }
  return errors;
}

/* ── PUBLIC ─────────────────────────────────── */

router.get('/', require('../middleware/auth').optionalAuth, function(req, res) {
  let items = db.experiences.all();

  /* includeDrafts=1 only honoured for authenticated admins (issue #22) */
  var showDrafts = req.query.includeDrafts === '1' &&
                   req.user && req.user.role === 'admin';
  if (!showDrafts) {
    items = items.filter(function(e){ return e.status !== 'draft'; });
  }

  /* Validate segment/type filters against allowlists to prevent NoSQL-style injection */
  if (req.query.segment && ALLOWED_SEGMENTS.includes(req.query.segment)) {
    items = items.filter(function(e){ return e.segment === req.query.segment; });
  }
  if (req.query.type && ALLOWED_TYPES.includes(req.query.type)) {
    items = items.filter(function(e){ return e.type === req.query.type; });
  }

  items.sort(function(a,b){
    var so = (a.sortOrder||0) - (b.sortOrder||0);
    if (so !== 0) return so;
    return (a.created||'') < (b.created||'') ? -1 : 1;
  });
  res.json({ experiences: items });
});

router.get('/:id', function(req, res) {
  const r = db.experiences.find(function(e){ return e.id === req.params.id; });
  if (!r) return res.status(404).json({ error: 'Experience not found' });
  res.json({ experience: r });
});

/* ── ADMIN ──────────────────────────────────── */

router.post('/', adminOnly, function(req, res) {
  const b = req.body || {};
  const errors = validateBody(b, false);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const baseId = b.id ? slugify(b.id) : slugify(b.title);
  const id = uniqueId(baseId);

  var allRows = db.experiences.all();
  var maxSort = allRows.reduce(function(m, r){ return Math.max(m, r.sortOrder||0); }, 0);
  var now = new Date().toISOString();

  var doc = {
    id: id,
    segment: b.segment, type: b.type, title: String(b.title).trim(),
    loc: b.loc || '', dur: b.dur || '',
    days:   parseInt(b.days)   || 1,
    nights: parseInt(b.nights) || 0,
    price:  parseInt(b.price)  || 0,
    pChild: b.pChild != null && b.pChild !== '' ? parseInt(b.pChild) : null,
    rating: Number.isFinite(+b.rating) ? +b.rating : 4.8,
    rev:    parseInt(b.rev)  || 0,
    maxP:   parseInt(b.maxP) || 20,
    minP:   parseInt(b.minP) || 1,
    badge:  b.badge || '',
    tags:   asArray(b.tags),
    img:    b.img || '',
    imgs:   asArray(b.imgs),
    desc:   b.desc || '',
    hi:     asArray(b.hi),
    inc:    asArray(b.inc),
    exc:    asArray(b.exc),
    it:      Array.isArray(b.it) ? b.it : [],
    circuit: Array.isArray(b.circuit) ? b.circuit : (b.circuit ? String(b.circuit).split(',').map(function(s){return s.trim();}).filter(Boolean) : []),
    dif:     ALLOWED_DIFF.includes(b.dif) ? b.dif : 'Facile',
    dates:  Array.isArray(b.dates) ? b.dates : [],
    status: ALLOWED_STATUS.includes(b.status) ? b.status : 'open',
    booked: parseInt(b.booked) || 0,
    sortOrder: maxSort + 1,
    created: now, updated: now
  };
  db.experiences.insert(doc);
  res.status(201).json({ experience: doc });
});

router.put('/:id', adminOnly, function(req, res) {
  const b = req.body || {};
  const existing = db.experiences.find(function(e){ return e.id === req.params.id; });
  if (!existing) return res.status(404).json({ error: 'Experience not found' });

  const errors = validateBody(b, true);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  var changes = {};
  if (b.segment !== undefined) changes.segment = b.segment;
  if (b.type    !== undefined) changes.type    = b.type;
  if (b.title   !== undefined) changes.title   = String(b.title).trim();
  if (b.loc     !== undefined) changes.loc     = b.loc || '';
  if (b.dur     !== undefined) changes.dur     = b.dur || '';
  if (b.days    !== undefined) changes.days    = parseInt(b.days)   || 1;
  if (b.nights  !== undefined) changes.nights  = parseInt(b.nights) || 0;
  if (b.price   !== undefined) changes.price   = parseInt(b.price)  || 0;
  if (b.pChild  !== undefined) changes.pChild  = b.pChild != null && b.pChild !== '' ? parseInt(b.pChild) : null;
  if (b.rating  !== undefined) changes.rating  = Number.isFinite(+b.rating) ? +b.rating : 4.8;
  if (b.rev     !== undefined) changes.rev     = parseInt(b.rev) || 0;
  if (b.maxP    !== undefined) changes.maxP    = parseInt(b.maxP) || 20;
  if (b.minP    !== undefined) changes.minP    = parseInt(b.minP) || 1;
  if (b.badge   !== undefined) changes.badge   = b.badge || '';
  if (b.tags    !== undefined) changes.tags    = asArray(b.tags);
  if (b.img     !== undefined) changes.img     = b.img || '';
  if (b.imgs    !== undefined) changes.imgs    = asArray(b.imgs);
  if (b.desc    !== undefined) changes.desc    = b.desc || '';
  if (b.hi      !== undefined) changes.hi      = asArray(b.hi);
  if (b.inc     !== undefined) changes.inc     = asArray(b.inc);
  if (b.exc     !== undefined) changes.exc     = asArray(b.exc);
  if (b.it      !== undefined) changes.it      = Array.isArray(b.it) ? b.it : [];
  if (b.circuit !== undefined) changes.circuit = Array.isArray(b.circuit) ? b.circuit : (b.circuit ? String(b.circuit).split(',').map(function(s){return s.trim();}).filter(Boolean) : []);
  if (b.dif     !== undefined) changes.dif     = ALLOWED_DIFF.includes(b.dif) ? b.dif : 'Facile';
  if (b.dates   !== undefined) changes.dates   = Array.isArray(b.dates) ? b.dates : [];
  if (b.status  !== undefined) changes.status  = ALLOWED_STATUS.includes(b.status) ? b.status : 'open';
  if (b.booked  !== undefined) changes.booked  = parseInt(b.booked) || 0;

  if (!Object.keys(changes).length) return res.status(400).json({ error: 'Nothing to update' });

  changes.updated = new Date().toISOString();
  db.experiences.update(function(e){ return e.id === req.params.id; }, changes);
  const updated = db.experiences.find(function(e){ return e.id === req.params.id; });
  res.json({ experience: updated });
});

router.delete('/:id', adminOnly, function(req, res) {
  const r = db.experiences.find(function(e){ return e.id === req.params.id; });
  if (!r) return res.status(404).json({ error: 'Experience not found' });
  db.experiences.remove(function(e){ return e.id === req.params.id; });
  res.json({ message: 'Experience deleted', id: req.params.id });
});

module.exports = router;
