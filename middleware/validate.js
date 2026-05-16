'use strict';
/**
 * middleware/validate.js — Reusable input validators and sanitisers
 */

/* RFC 5322 simplified — rejects newlines (header injection) */
var EMAIL_RE = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,63}$/;

/* Phone: starts with + or digit, 7-21 total chars, only allowed chars */
var PHONE_RE = /^[+\d][\d\s\-().]{5,19}$/;

/** isEmail(s) — returns true for valid email addresses */
function isEmail(s) {
  return typeof s === 'string' &&
         EMAIL_RE.test(s.trim()) &&
         !/[\r\n]/.test(s);           // block header injection
}

/** isPhone(s) — returns true if string looks like a phone number (or is empty) */
function isPhone(s) {
  if (!s || String(s).trim() === '') return true; // phone is optional on most routes
  return typeof s === 'string' && PHONE_RE.test(s.trim());
}

/**
 * passwordError(password) — validates password strength
 * Returns null if valid, or an error string describing the problem.
 * Requirements: ≥ 8 chars, at least one letter, at least one digit.
 */
function passwordError(p) {
  if (!p || typeof p !== 'string') return 'Password is required';
  if (p.length < 8)                return 'Password must be at least 8 characters';
  if (!/[a-zA-Z]/.test(p))        return 'Password must contain at least one letter';
  if (!/[0-9]/.test(p))           return 'Password must contain at least one digit';
  return null;
}

/**
 * htmlEscape(s) — encode characters with special HTML meaning
 * Use in email templates and anywhere user content is placed in HTML context.
 */
function htmlEscape(s) {
  if (typeof s !== 'string') return String(s == null ? '' : s);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;');
}

/**
 * stripDangerousHtml(s) — remove script tags, event handlers, and
 * javascript: URLs from CMS strings that are intentionally allowed
 * to contain safe HTML (e.g., <br>, <em class="s">).
 */
function stripDangerousHtml(s) {
  if (typeof s !== 'string') return s;
  return s
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[^>]*/gi, '')
    .replace(/<form[^>]*/gi, '')
    .replace(/javascript\s*:/gi, 'javascript&#x3A;')
    .replace(/\bon\w+\s*=\s*["'][^"']*["']/gi, '')    // strip inline event handlers
    .replace(/\bon\w+\s*=\s*[^\s>]*/gi, '');           // strip unquoted event handlers
}

module.exports = { isEmail, isPhone, passwordError, htmlEscape, stripDangerousHtml };
