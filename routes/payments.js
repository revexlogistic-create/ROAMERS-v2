'use strict';
/**
 * routes/payments.js
 *
 * POST /api/payments/intent   — create a Stripe PaymentIntent for a booking
 * POST /api/payments/webhook  — Stripe webhook: mark booking as paid
 */

var router  = require('express').Router();
var db      = require('../database');
var authMw  = require('../middleware/auth');

var optionalAuth = authMw.optionalAuth;

/* Lazy-load Stripe only when the route is first called (keeps startup fast) */
function getStripe() {
  var key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY env variable is not set');
  return require('stripe')(key);
}

/* ── CREATE PAYMENT INTENT ──────────────────────────────────────────────────
   Call this AFTER creating the booking (you'll have a bookingId).
   Returns { clientSecret } which the frontend passes to Stripe.js / SDK.
   The amount is re-read from the database — the client cannot manipulate it.
──────────────────────────────────────────────────────────────────────────── */
router.post('/intent', optionalAuth, async function(req, res) {
  try {
    var bookingId = req.body && req.body.bookingId;
    if (!bookingId) return res.status(400).json({ error: 'bookingId is required' });

    /* Load booking from DB — never trust the client for the amount */
    var booking = db.bookings.find(function(b) { return b.id === bookingId; });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.payment === 'paid') {
      return res.status(400).json({ error: 'This booking is already paid' });
    }

    /* Stripe amounts are in the smallest currency unit (centimes for MAD) */
    var amountCentimes = Math.round(Number(booking.total) * 100);
    if (amountCentimes < 50) {
      return res.status(400).json({ error: 'Amount too small for payment processing' });
    }

    var stripe  = getStripe();
    var intent  = await stripe.paymentIntents.create({
      amount:   amountCentimes,
      currency: 'mad',                 /* Moroccan Dirham */
      metadata: {
        bookingId:  booking.id,
        expTitle:   booking.expTitle  || '',
        customerEmail: booking.email  || '',
      },
      description: 'Roamers — ' + (booking.expTitle || booking.id),
      receipt_email: booking.email || undefined,
    });

    res.json({ clientSecret: intent.client_secret });
  } catch (err) {
    console.error('[payments] intent error:', err.message);
    res.status(500).json({ error: 'Payment initialisation failed: ' + err.message });
  }
});

/* ── STRIPE WEBHOOK ─────────────────────────────────────────────────────────
   Stripe calls this URL after a successful payment.
   We verify the signature with STRIPE_WEBHOOK_SECRET so it cannot be faked.
──────────────────────────────────────────────────────────────────────────── */
router.post(
  '/webhook',
  /* Raw body required for Stripe signature verification */
  require('express').raw({ type: 'application/json' }),
  async function(req, res) {
    var sig     = req.headers['stripe-signature'];
    var secret  = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret) {
      console.error('[payments] STRIPE_WEBHOOK_SECRET not set — webhook ignored');
      return res.status(400).json({ error: 'Webhook secret not configured' });
    }

    var event;
    try {
      var stripe = getStripe();
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } catch (err) {
      console.error('[payments] webhook signature error:', err.message);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    if (event.type === 'payment_intent.succeeded') {
      var intent    = event.data.object;
      var bookingId = intent.metadata && intent.metadata.bookingId;

      if (bookingId) {
        db.bookings.update(
          function(b) { return b.id === bookingId; },
          { payment: 'paid', paidAt: new Date().toISOString(), stripeIntentId: intent.id }
        );
        await db.bookings.flush();
        console.log('[payments] booking paid:', bookingId);
      }
    }

    res.json({ received: true });
  }
);

module.exports = router;
