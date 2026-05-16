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

module.exports = { sendBookingConfirmation, sendContactNotification, sendPlanRequest, sendTeamRequest };
