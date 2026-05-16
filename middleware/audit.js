'use strict';
/**
 * middleware/audit.js — Compliance audit log (Loi 09-08 Maroc)
 *
 * Logs every personal-data access or modification:
 *   { ts, action, userId, ip, method, path, status }
 *
 * Production / Vercel: writes to /tmp/roamers-audit/ (persists within invocation)
 * Development:         writes to ./logs/audit/ and echoes to console
 */

var fs   = require('fs');
var path = require('path');

var _logDir = null;

function getLogDir() {
  if (_logDir) return _logDir;
  var dir = (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1')
    ? '/tmp/roamers-audit'
    : path.resolve('./logs/audit');
  try {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    _logDir = dir;
  } catch (_) {
    _logDir = '/tmp/roamers-audit';
    try { if (!fs.existsSync(_logDir)) fs.mkdirSync(_logDir, { recursive: true }); } catch (__) {}
  }
  return _logDir;
}

function getIp(req) {
  var xff = req.headers['x-forwarded-for'];
  if (xff) return xff.split(',')[0].trim();
  return req.headers['x-real-ip'] || (req.socket && req.socket.remoteAddress) || 'unknown';
}

function write(entry) {
  var line = JSON.stringify(entry) + '\n';
  var dir  = getLogDir();
  var file = path.join(dir, 'audit-' + new Date().toISOString().slice(0, 10) + '.log');
  try { fs.appendFileSync(file, line); } catch (_) {}
  if (process.env.NODE_ENV !== 'production') {
    console.log('[AUDIT]', entry.action, '|', entry.userId || 'guest', '|', entry.ip,
                '|', entry.method, entry.path, '→', entry.status || '?');
  }
}

/**
 * audit(action) — Express middleware factory
 * Wraps res.json to log the outcome after the handler runs.
 *
 * Usage:  router.post('/bookings', audit('booking:create'), handler)
 */
function audit(action) {
  return function auditMiddleware(req, res, next) {
    var userId = req.user ? req.user.id : 'guest';
    var ip     = getIp(req);
    var orig   = res.json.bind(res);

    res.json = function(body) {
      var status = res.statusCode || 200;
      /* Only log successful operations (< 400) */
      if (status < 400) {
        write({
          ts:     new Date().toISOString(),
          action: action,
          userId: userId,
          ip:     ip,
          method: req.method,
          path:   req.path,
          status: status
        });
      }
      return orig(body);
    };
    next();
  };
}

/**
 * log(action, userId, ip, extra) — direct write for auth events, etc.
 */
function log(action, userId, ip, extra) {
  write(Object.assign(
    { ts: new Date().toISOString(), action: action, userId: userId || 'unknown', ip: ip || 'unknown' },
    extra || {}
  ));
}

module.exports = { audit: audit, log: log, getIp: getIp };
