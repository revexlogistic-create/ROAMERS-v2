'use strict';
/**
 * utils/google.js — verify a Google ID token (no external dependency)
 *
 * Calls Google's tokeninfo endpoint, which validates the token signature and
 * expiry server-side and returns the decoded payload. The caller is still
 * responsible for checking `aud` against the app's allowed client IDs.
 */
var https = require('https');

function verifyIdToken(idToken) {
  return new Promise(function(resolve, reject) {
    var url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(String(idToken || ''));
    var req = https.get(url, function(res) {
      var buf = '';
      res.on('data', function(d){ buf += d; });
      res.on('end', function() {
        if (res.statusCode !== 200) {
          return reject(new Error('tokeninfo HTTP ' + res.statusCode + ': ' + buf.slice(0, 200)));
        }
        var p;
        try { p = JSON.parse(buf); } catch (e) { return reject(new Error('tokeninfo: invalid JSON')); }
        resolve(p);
      });
    });
    req.on('error', reject);
    req.setTimeout(8000, function(){ req.destroy(new Error('tokeninfo timeout')); });
  });
}

module.exports = { verifyIdToken };
