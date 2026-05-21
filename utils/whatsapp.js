'use strict';
/**
 * utils/whatsapp.js — WhatsApp OTP / message sending
 *
 * Supported providers (set WHATSAPP_PROVIDER env var):
 *
 *   ultramsg  → https://ultramsg.com
 *               Requires: ULTRAMSG_INSTANCE_ID, ULTRAMSG_TOKEN
 *
 *   waapi     → https://waapi.app
 *               Requires: WAAPI_INSTANCE_ID, WAAPI_TOKEN
 *
 *   (unset)   → console.log  (development / no provider configured)
 *
 * No extra npm packages — uses Node built-in https module.
 */

const https = require('https');
const http  = require('http');

/* ── Low-level HTTP POST ────────────────────────────────────── */
function httpPost(url, body) {
  return new Promise(function(resolve, reject) {
    var u       = new URL(url);
    var payload = JSON.stringify(body);
    var options = {
      hostname: u.hostname,
      port:     u.port || (u.protocol === 'https:' ? 443 : 80),
      path:     u.pathname + u.search,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    var mod = u.protocol === 'https:' ? https : http;
    var req = mod.request(options, function(res) {
      var buf = '';
      res.on('data', function(d) { buf += d; });
      res.on('end',  function()  { resolve({ status: res.statusCode, body: buf }); });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/* ── Normalise phone: keep digits only ─────────────────────── */
function normalisePhone(phone) {
  return String(phone || '').replace(/[^0-9]/g, '');
}

/* ── Send a WhatsApp message ────────────────────────────────── */
async function sendMessage(phone, message) {
  var to       = normalisePhone(phone);
  var provider = (process.env.WHATSAPP_PROVIDER || '').toLowerCase().trim();

  /* ── UltraMsg ── */
  if (provider === 'ultramsg') {
    var instanceId = process.env.ULTRAMSG_INSTANCE_ID;
    var token      = process.env.ULTRAMSG_TOKEN;
    if (!instanceId || !token) throw new Error('ULTRAMSG_INSTANCE_ID and ULTRAMSG_TOKEN are required');
    var r = await httpPost(
      'https://api.ultramsg.com/' + instanceId + '/messages/chat',
      { token: token, to: '+' + to, body: message, priority: 1 }
    );
    if (r.status >= 400) throw new Error('UltraMsg error (' + r.status + '): ' + r.body);
    return;
  }

  /* ── Green API (free tier available) ── */
  if (provider === 'greenapi') {
    var gaInstance = process.env.GREENAPI_INSTANCE_ID;
    var gaToken    = process.env.GREENAPI_TOKEN;
    if (!gaInstance || !gaToken) throw new Error('GREENAPI_INSTANCE_ID and GREENAPI_TOKEN are required');
    /* Green API expects phone in format 212XXXXXXXXX@c.us (country code, no +) */
    var chatId = to + '@c.us';
    var gr = await httpPost(
      'https://api.green-api.com/waInstance' + gaInstance + '/sendMessage/' + gaToken,
      { chatId: chatId, message: message }
    );
    if (gr.status >= 400) throw new Error('Green API error (' + gr.status + '): ' + gr.body);
    return;
  }

  /* ── WaAPI ── */
  if (provider === 'waapi') {
    var waInstanceId = process.env.WAAPI_INSTANCE_ID;
    var waToken      = process.env.WAAPI_TOKEN;
    if (!waInstanceId || !waToken) throw new Error('WAAPI_INSTANCE_ID and WAAPI_TOKEN are required');
    var wr = await httpPost(
      'https://waapi.app/api/v1/instances/' + waInstanceId + '/client/action/send-message',
      { chatId: to + '@c.us', message: message }
    );
    if (wr.status >= 400) throw new Error('WaAPI error (' + wr.status + '): ' + wr.body);
    return;
  }

  /* ── Console fallback (development) ── */
  console.log('\n  📲 [WhatsApp → +' + to + ']\n  ' + message + '\n');
}

/* ── Generate a 6-digit OTP ─────────────────────────────────── */
function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/* ── Send OTP to a phone number ─────────────────────────────── */
async function sendOtp(phone, code) {
  var msg = '🔐 *Roamers Community* — Code de vérification :\n\n*' + code + '*\n\nValable 15 minutes.\nNe partagez ce code avec personne.';
  return sendMessage(phone, msg);
}

module.exports = { sendOtp, sendMessage, generateOtp, normalisePhone };
