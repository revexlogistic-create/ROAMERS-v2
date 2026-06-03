'use strict';
/**
 * mailer.js — Email notifications (graceful no-op if SMTP not configured)
 *
 * Security hardening applied:
 *  [14] All user-supplied values are HTML-encoded before insertion into email templates
 */

var nodemailer = require('nodemailer');
var validate   = require('./middleware/validate');
require('dotenv').config();

var e = validate.htmlEscape; /* shorthand */

var transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT) || 587,
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

var FROM        = process.env.SMTP_FROM   || 'Roamers Community <hello@roamerscommunity.ma>';
var ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@roamerscommunity.ma';
var WA          = process.env.WHATSAPP_NUMBER || '212600000000';

async function send(to, subject, html) {
  if (!transporter) {
    console.log('[MAIL — not configured] To:', to, '| Subject:', subject);
    return;
  }
  await transporter.sendMail({ from: FROM, to, subject, html });
}

/** True when an SMTP transporter is configured (used to gate dev devCode). */
function isConfigured() { return !!transporter; }

/**
 * Send a verification (OTP) code by email.
 * Returns true ONLY if the mail was actually accepted by the SMTP server,
 * false otherwise (transporter missing or send failed) — callers rely on this
 * boolean to decide whether the customer really received a code.
 */
async function sendOtpEmail(to, code, name) {
  if (!transporter) {
    console.log('[MAIL — not configured] OTP for', to, '=', code);
    return false;
  }
  var safeName = e(name || '');
  var safeCode = e(String(code));
  var html = `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0e0e0e;border-radius:14px;overflow:hidden">
      <div style="background:#B8172E;padding:26px;text-align:center">
        <h1 style="color:#fff;font-size:22px;margin:0;letter-spacing:2px">ROAMERS COMMUNITY</h1>
      </div>
      <div style="padding:28px;background:#fff">
        <p style="color:#111;font-size:15px">Bonjour ${safeName || ''},</p>
        <p style="color:#444;font-size:14px;line-height:21px">Voici votre code de vérification pour activer votre compte&nbsp;:</p>
        <div style="text-align:center;margin:22px 0">
          <span style="display:inline-block;background:#f6f6f6;border:2px solid #B8172E;border-radius:12px;padding:14px 26px;font-size:32px;font-weight:800;letter-spacing:10px;color:#B8172E">${safeCode}</span>
        </div>
        <p style="color:#666;font-size:13px;line-height:19px">Ce code est valable <strong>15 minutes</strong>. Ne le partagez avec personne.</p>
        <p style="color:#999;font-size:12px;margin-top:22px">Si vous n'avez pas demandé ce code, ignorez simplement cet email.</p>
      </div>
    </div>`;
  try {
    await transporter.sendMail({
      from: FROM,
      to: to,
      subject: 'Votre code de vérification Roamers : ' + String(code),
      html: html,
    });
    return true;
  } catch (err) {
    console.error('[OTP email error]', err.message);
    return false;
  }
}

/* ── EMAIL TEMPLATES (all user values HTML-escaped) ───────────── */

async function sendBookingConfirmation(b) {
  var clientHtml = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#B8172E;padding:28px;text-align:center">
        <h1 style="color:#fff;font-size:24px;margin:0">Booking Confirmed</h1>
      </div>
      <div style="padding:28px;background:#fff">
        <p>Hello ${e(b.name)},</p>
        <p>Your booking with <strong>Roamers Community</strong> has been received.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:7px 0;color:#666;border-bottom:1px solid #eee">Reference</td><td style="font-weight:700;color:#B8172E">${e(b.id)}</td></tr>
          <tr><td style="padding:7px 0;color:#666;border-bottom:1px solid #eee">Experience</td><td>${e(b.expTitle || b.exp_title || '')}</td></tr>
          <tr><td style="padding:7px 0;color:#666;border-bottom:1px solid #eee">Date</td><td>${e(b.date)}</td></tr>
          <tr><td style="padding:7px 0;color:#666;border-bottom:1px solid #eee">Guests</td><td>${e(String(b.adults))} adult(s)${b.children ? ' + ' + e(String(b.children)) + ' child(ren)' : ''}</td></tr>
          <tr><td style="padding:7px 0;color:#666">Total</td><td style="font-weight:700;font-size:18px">${e(Number(b.total).toLocaleString())} MAD</td></tr>
        </table>
        <p>Our team will contact you within <strong>24 hours</strong> to confirm your booking and arrange payment.</p>
        <p>Questions? WhatsApp us: <a href="https://wa.me/${e(WA)}">+${e(WA)}</a></p>
        <p style="color:#666;font-size:12px;margin-top:24px">Roamers Community — Morocco Adventure Booking</p>
      </div>
    </div>`;

  var adminHtml = `
    <p><strong>NEW BOOKING</strong></p>
    <p>Ref: ${e(b.id)}<br>
    Experience: ${e(b.expTitle || b.exp_title || '')}<br>
    Date: ${e(b.date)}<br>
    Guests: ${e(String(b.adults))}a${b.children ? '+' + e(String(b.children)) + 'c' : ''}<br>
    Client: ${e(b.name)} / ${e(b.email)} / ${e(b.phone)}<br>
    Total: ${e(Number(b.total).toLocaleString())} MAD</p>`;

  await Promise.all([
    send(b.email, 'Booking Confirmation — ' + b.id, clientHtml),
    send(ADMIN_EMAIL, '[New Booking] ' + b.id + ' — ' + (b.expTitle || b.exp_title || ''), adminHtml)
  ]);
}

async function sendContactNotification(m) {
  var html = `
    <p><strong>New Contact Message</strong></p>
    <p>From: ${e(m.fname)} ${e(m.lname || '')} &lt;${e(m.email)}&gt;</p>
    ${m.phone   ? `<p>Phone: ${e(m.phone)}</p>`   : ''}
    ${m.subject ? `<p>Subject: ${e(m.subject)}</p>` : ''}
    <p>${e(m.message)}</p>`;
  await send(ADMIN_EMAIL, '[Contact] ' + (m.subject || 'New message') + ' — ' + m.fname, html);
}

async function sendPlanRequest(r) {
  var html = `
    <p><strong>New Plan My Trip Request</strong></p>
    <p>Ref: ${e(r.id)}<br>
    From: ${e(r.fname)} / ${e(r.email)} / ${e(r.phone)}<br>
    Segment: ${e(r.segment || '—')}<br>
    Group: ${e(r.groupSize || '—')}<br>
    Duration: ${e(r.duration || '—')}<br>
    Budget: ${e(r.budget || '—')}<br>
    Message: ${e(r.message || '—')}</p>`;
  await send(ADMIN_EMAIL, '[Plan My Trip] ' + r.id + ' — ' + r.fname, html);
}

async function sendTeamRequest(r) {
  var html = `
    <p><strong>New Team Building Request</strong></p>
    <p>Ref: ${e(r.id)}<br>
    Company: ${e(r.company)}<br>
    Contact: ${e(r.contactFn)} ${e(r.contactLn || '')} / ${e(r.email)} / ${e(r.phone)}<br>
    Group: ${e(r.groupSize || '—')}<br>
    Programs: ${e((r.programs || []).join(', ') || '—')}<br>
    Budget: ${e(r.budget || '—')}</p>`;
  await send(ADMIN_EMAIL, '[Team Building] ' + r.id + ' — ' + r.company, html);
}

module.exports = { sendBookingConfirmation, sendContactNotification, sendPlanRequest, sendTeamRequest, sendOtpEmail, isConfigured };
