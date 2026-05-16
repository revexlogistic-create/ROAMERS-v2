'use strict';
/**
 * middleware/sanitize.js
 * Input sanitisation — strips null bytes and control characters,
 * enforces per-field length limits on every request body and query string.
 */

/* Field-level character limits */
var LIMITS = {
  /* Free-text / long fields */
  message:  4000,
  messages: 4000,
  notes:    2000,
  note:     2000,
  bio:      1000,
  desc:     3000,
  body:     5000,
  text:     3000,
  content:  5000,
  /* Image / video fields — base64 data: URIs can be large */
  img:      6 * 1024 * 1024,
  imgs:     6 * 1024 * 1024,
  video:    6 * 1024 * 1024,
  heroimg:  6 * 1024 * 1024,
  herovideo:6 * 1024 * 1024,
  /* Default for all other string fields */
  _default: 1000
};

function getLimit(key) {
  if (!key) return LIMITS._default;
  var k = key.toLowerCase();
  if (/img|image|photo/.test(k)) return LIMITS.img;
  if (/video/.test(k))           return LIMITS.video;
  if (/message|msg/.test(k))     return LIMITS.message;
  if (/note/.test(k))            return LIMITS.note;
  if (/bio/.test(k))             return LIMITS.bio;
  if (/desc|body|text|content/.test(k)) return LIMITS.desc;
  return LIMITS._default;
}

function cleanString(s, key) {
  if (typeof s !== 'string') return s;
  /* Remove null bytes and non-printable control characters (keep \n \r \t) */
  s = s.replace(/[\x00\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  /* Enforce length */
  var limit = getLimit(key);
  if (s.length > limit) s = s.slice(0, limit);
  return s;
}

function sanitizeValue(val, key) {
  if (typeof val === 'string')                        return cleanString(val, key);
  if (Array.isArray(val))                             return val.map(function(v){ return sanitizeValue(v, key); });
  if (val !== null && typeof val === 'object')        return sanitizeObject(val);
  return val;
}

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  var out = {};
  Object.keys(obj).forEach(function(k) { out[k] = sanitizeValue(obj[k], k); });
  return out;
}

module.exports = function sanitize(req, res, next) {
  if (req.body  && typeof req.body  === 'object') req.body  = sanitizeObject(req.body);
  if (req.query && typeof req.query === 'object') {
    Object.keys(req.query).forEach(function(k) {
      if (typeof req.query[k] === 'string') req.query[k] = cleanString(req.query[k], k);
    });
  }
  next();
};
