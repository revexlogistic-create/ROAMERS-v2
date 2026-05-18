'use strict';
/**
 * utils/notify.js
 *
 * Automatic push notification service.
 * Called by route handlers after key events.
 * Templates are managed by admin in Settings > notifTemplates.
 *
 * Delivery: Firebase Admin SDK (direct FCM) via utils/fcm.js
 */

var db  = require('../database');
var fcm = require('./fcm');

/* ─── Default templates ──────────────────────────────────────── */
var DEFAULT_TEMPLATES = {
  booking_created: {
    enabled: true,
    title:   'Réservation enregistrée ✅',
    body:    'Bonjour {{name}}, votre réservation pour {{tripTitle}} ({{date}}) a bien été reçue. Réf : {{ref}}'
  },
  booking_confirmed: {
    enabled: true,
    title:   'Réservation confirmée 🎉',
    body:    'Bonjour {{name}}, votre réservation pour {{tripTitle}} est confirmée par notre équipe. À très bientôt !'
  },
  booking_cancelled: {
    enabled: true,
    title:   'Réservation annulée',
    body:    'Votre réservation pour {{tripTitle}} a été annulée. Contactez-nous pour plus d\'informations.'
  },
  payment_received: {
    enabled: true,
    title:   'Paiement reçu 💰',
    body:    'Nous avons bien reçu {{amount}} MAD pour {{tripTitle}}. Merci {{name}} !'
  },
  payment_completed: {
    enabled: true,
    title:   'Paiement complet ✅',
    body:    'Votre voyage {{tripTitle}} est entièrement réglé. Préparez vos bagages, {{name}} !'
  },
  plan_request: {
    enabled: true,
    title:   'Demande de voyage reçue 🗺️',
    body:    'Bonjour {{name}}, votre demande de voyage sur mesure ({{ref}}) a bien été reçue. Notre équipe vous répond sous 48h.'
  },
  team_request: {
    enabled: true,
    title:   'Demande team building reçue 🤝',
    body:    'Bonjour {{name}}, votre demande team building pour {{company}} ({{ref}}) a été enregistrée. Nous vous contactons rapidement.'
  },
  itinerary_saved: {
    enabled: true,
    title:   'Itinéraire sauvegardé 🛤️',
    body:    'Bonjour {{name}}, votre itinéraire personnalisé a bien été sauvegardé dans l\'app.'
  }
};

/* ─── Helpers ────────────────────────────────────────────────── */
function fillVars(text, vars) {
  return (text || '').replace(/\{\{(\w+)\}\}/g, function(_, key) {
    return vars[key] != null ? String(vars[key]) : '';
  });
}

/**
 * Get the effective template for an event type.
 * Admin-stored values override defaults.
 */
function getTemplate(eventType) {
  var def      = DEFAULT_TEMPLATES[eventType] || { enabled: false, title: '', body: '' };
  var settings = db.settings.find(function(){ return true; }) || {};
  var stored   = (settings.notifTemplates || {})[eventType];
  return {
    enabled: stored ? (stored.enabled !== false) : def.enabled,
    title:   (stored && stored.title != null) ? stored.title : def.title,
    body:    (stored && stored.body  != null) ? stored.body  : def.body
  };
}


/**
 * Send an automatic notification to a specific email.
 * Safe to call fire-and-forget (.catch(() => {})).
 *
 * @param {string} email      - recipient email (matched against push token)
 * @param {string} eventType  - key in DEFAULT_TEMPLATES
 * @param {object} vars       - template variables { name, tripTitle, … }
 */
async function notifyByEmail(email, eventType, vars) {
  try {
    if (!email) return;

    var tpl = getTemplate(eventType);
    if (!tpl.enabled || !tpl.title || !tpl.body) return;

    /* Find active token for this email */
    var tokenDoc = db.pushTokens.find(function(t){
      return t.email && t.email.toLowerCase() === email.toLowerCase() && t.active !== false;
    });
    if (!tokenDoc) return;

    var title = fillVars(tpl.title, vars);
    var body  = fillVars(tpl.body,  vars);

    var ok = await fcm.sendOne(tokenDoc.token, title, body, { eventType: eventType });

    console.log('[Notify]', eventType, '->', email, ok ? '— OK' : '— FAIL (check FCM config)');
  } catch(err) {
    console.warn('[Notify]', eventType, '->', email, '— Error:', err.message);
  }
}

module.exports = {
  notifyByEmail:    notifyByEmail,
  getTemplate:      getTemplate,
  DEFAULT_TEMPLATES: DEFAULT_TEMPLATES,
  TEMPLATE_VARS: {
    booking_created:   ['name','tripTitle','date','total','ref'],
    booking_confirmed: ['name','tripTitle'],
    booking_cancelled: ['name','tripTitle'],
    payment_received:  ['name','tripTitle','amount','total'],
    payment_completed: ['name','tripTitle','total'],
    plan_request:      ['name','ref'],
    team_request:      ['name','company','ref'],
    itinerary_saved:   ['name']
  }
};
