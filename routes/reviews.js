/**
 * routes/reviews.js
 * Client reviews tied to real bookings.
 *
 * GET  /api/reviews/:expId          — public, returns approved reviews + rating summary
 * POST /api/reviews                 — authenticated; requires a non-cancelled booking
 */

const router = require('express').Router();
const crypto = require('crypto');
const db     = require('../database');
const { auth: requireAuth, adminOnly } = require('../middleware/auth');

/* ── GET reviews for one experience ───────────────────────── */
router.get('/:expId', function(req, res) {
  var expId = req.params.expId;
  var reviews = db.reviews.all(function(r) {
    return r.expId === expId && r.status === 'approved';
  }).sort(function(a, b) { return b.created > a.created ? 1 : -1; });

  /* Compute rating distribution */
  var dist = [0, 0, 0, 0, 0]; /* index 0 = 1 star … index 4 = 5 stars */
  reviews.forEach(function(r) { if (r.rating >= 1 && r.rating <= 5) dist[r.rating - 1]++; });
  var total = reviews.length;
  var avg = total ? Math.round((reviews.reduce(function(s, r) { return s + r.rating; }, 0) / total) * 10) / 10 : 0;

  res.json({
    reviews: reviews,
    summary: { avg: avg, total: total, dist: dist }
  });
});

/* ── POST submit a new review ──────────────────────────────── */
router.post('/', requireAuth, async function(req, res) {
  var user = req.user;
  var b    = req.body || {};
  var expId  = String(b.expId  || '').trim();
  var rating = parseInt(b.rating);
  var text   = String(b.text   || '').trim().slice(0, 1000);

  /* Validate */
  if (!expId)                                return res.status(400).json({ error: 'expId requis' });
  if (!rating || rating < 1 || rating > 5)   return res.status(400).json({ error: 'Note entre 1 et 5 requise' });
  if (text.length < 10)                      return res.status(400).json({ error: 'Avis trop court (min 10 caractères)' });

  /* Experience must exist */
  var exp = db.experiences.find(function(e) { return e.id === expId; });
  if (!exp) return res.status(404).json({ error: 'Expérience introuvable' });

  /* User must have at least one non-cancelled booking for this experience */
  var booking = db.bookings.find(function(bk) {
    return bk.userId === user.id && bk.expId === expId && bk.status !== 'cancelled';
  });
  if (!booking) return res.status(403).json({ error: 'Vous devez avoir réservé ce voyage pour laisser un avis' });

  /* Prevent duplicate review per user per experience */
  var already = db.reviews.find(function(r) {
    return r.userId === user.id && r.expId === expId;
  });
  if (already) return res.status(409).json({ error: 'Vous avez déjà laissé un avis pour cette expérience' });

  /* Build display name: first name + last initial */
  var fname = (user.fname || user.name || '').trim();
  var lname = (user.lname || '').trim();
  var displayName = fname + (lname ? ' ' + lname[0] + '.' : '');
  var initial = (fname[0] || '?').toUpperCase();

  var doc = {
    id:          crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'),
    expId:       expId,
    userId:      user.id,
    bookingId:   booking.id,
    rating:      rating,
    text:        text,
    displayName: displayName,
    initial:     initial,
    status:      'approved',   /* auto-approve; admin can set to 'hidden' later */
    created:     new Date().toISOString()
  };

  db.reviews.insert(doc);
  await db.reviews.flush();

  /* Recompute experience average rating */
  var allRev = db.reviews.all(function(r) { return r.expId === expId && r.status === 'approved'; });
  var newAvg = allRev.length
    ? Math.round((allRev.reduce(function(s, r) { return s + r.rating; }, 0) / allRev.length) * 10) / 10
    : exp.rating;
  db.experiences.update(function(e) { return e.id === expId; }, {
    rating: newAvg,
    rev:    allRev.length
  });
  await db.experiences.flush();

  res.status(201).json({ review: doc, newRating: newAvg, newRev: allRev.length });
});

/* ── Admin: hide/show a review ─────────────────────────────── */
router.patch('/:id/status', adminOnly, async function(req, res) {
  var r = db.reviews.find(function(x) { return x.id === req.params.id; });
  if (!r) return res.status(404).json({ error: 'Review not found' });
  var status = req.body.status === 'hidden' ? 'hidden' : 'approved';
  db.reviews.update(function(x) { return x.id === req.params.id; }, { status: status });
  await db.reviews.flush();

  /* Recompute experience average */
  var allRev = db.reviews.all(function(x) { return x.expId === r.expId && x.status === 'approved'; });
  if (allRev.length >= 0) {
    var newAvg = allRev.length
      ? Math.round((allRev.reduce(function(s, x) { return s + x.rating; }, 0) / allRev.length) * 10) / 10
      : 0;
    db.experiences.update(function(e) { return e.id === r.expId; }, {
      rating: newAvg || 0,
      rev:    allRev.length
    });
    await db.experiences.flush();
  }

  res.json({ ok: true, status: status });
});

module.exports = router;
