'use strict';
/**
 * utils/google.js — verify a Google ID token locally (no external dependency).
 *
 * Fetches Google's published RSA public keys (JWKS) and verifies the ID token's
 * signature + issuer with the built-in crypto + jsonwebtoken (already a dep).
 * This is more reliable than the legacy /tokeninfo endpoint, which can reject
 * perfectly valid tokens with "invalid_token / Invalid Value".
 */
var https  = require('https');
var crypto = require('crypto');
var jwt    = require('jsonwebtoken');

var CERTS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
var _certs = { keys: null, exp: 0 };

function httpsGetJson(url) {
  return new Promise(function(resolve, reject) {
    var req = https.get(url, function(res) {
      var buf = '';
      res.on('data', function(d){ buf += d; });
      res.on('end', function() {
        if (res.statusCode !== 200) return reject(new Error('certs HTTP ' + res.statusCode));
        try { resolve(JSON.parse(buf)); } catch (e) { reject(new Error('certs: invalid JSON')); }
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, function(){ req.destroy(new Error('certs timeout')); });
  });
}

async function getGoogleKeys() {
  var now = Date.now();
  if (_certs.keys && _certs.exp > now) return _certs.keys;
  var data = await httpsGetJson(CERTS_URL);
  _certs = { keys: (data && data.keys) || [], exp: now + 60 * 60 * 1000 };
  return _certs.keys;
}

/**
 * Verify a Google ID token. Resolves with the decoded payload
 * ({ aud, email, email_verified, name, given_name, family_name, sub, ... })
 * or rejects with a descriptive error.
 */
async function verifyIdToken(idToken) {
  var raw = String(idToken || '');
  var decoded = jwt.decode(raw, { complete: true });
  if (!decoded || !decoded.header || !decoded.header.kid) {
    throw new Error('malformed JWT (no kid header)');
  }

  var keys = await getGoogleKeys();
  var jwk  = keys.filter(function(k){ return k.kid === decoded.header.kid; })[0];
  if (!jwk) throw new Error('no matching Google signing key for kid ' + decoded.header.kid);

  var keyObj = crypto.createPublicKey({ key: jwk, format: 'jwk' });
  /* Export to PEM for maximum compatibility with jsonwebtoken */
  var pubKey = keyObj.export({ type: 'spki', format: 'pem' });
  /* jwt.verify checks signature + expiry + issuer; throws on any failure */
  return jwt.verify(raw, pubKey, {
    algorithms: ['RS256'],
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
  });
}

module.exports = { verifyIdToken };
