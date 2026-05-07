/**
 * mailer.js — Email notifications (graceful no-op if SMTP not configured)
 */
const nodemailer = require('nodemailer');
require('dotenv').config();

let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: parseInt(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
}

const FROM = process.env.SMTP_FROM || 'Roamers Community <hello@roamerscommunity.ma>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@roamerscommunity.ma';
const WA = process.env.WHATSAPP_NUMBER || '212600000000';

async function send(to, subject, html) {
  if (!transporter) {
    console.log(`[MAIL — not configured] To: ${to} | Subject: ${subject}`);
    return;
  }
  await transporter.sendMail({ from: FROM, to, subject, html });
}

/* ── Email templates ───────────────────────────────────────────── */

async function sendBookingConfirmation(b) {
  const clientHtml = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#B8172E;padding:28px;text-align:center">
        <h1 style="color:#fff;font-size:24px;margin:0">Booking Confirmed</h1>
      </div>
      <div style="padding:28px;background:#fff">
        <p>Hello ${b.name},</p>
        <p>Your booking with <strong>Roamers Community</strong> has been received.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:7px 0;color:#666;border-bottom:1px solid #eee">Reference</td><td style="font-weight:700;color:#B8172E">${b.id}</td></tr>
          <tr><td style="padding:7px 0;color:#666;border-bottom:1px solid #eee">Experience</td><td>${b.exp_title}</td></tr>
          <tr><td style="padding:7px 0;color:#666;border-bottom:1px solid #eee">Date</td><td>${b.date}</td></tr>
          <tr><td style="padding:7px 0;color:#666;border-bottom:1px solid #eee">Guests</td><td>${b.adults} adult(s)${b.children ? ' + ' + b.children + ' child(ren)' : ''}</td></tr>
          <tr><td style="padding:7px 0;color:#666">Total</td><td style="font-weight:700;font-size:18px">${Number(b.total).toLocaleString()} MAD</td></tr>
        </table>
        <p>Our team will contact you within <strong>24 hours</strong> to confirm your booking and arrange payment.</p>
        <p>Questions? WhatsApp us: <a href="https://wa.me/${WA}">+${WA}</a></p>
        <p style="color:#666;font-size:12px;margin-top:24px">Roamers Community — Morocco Adventure Booking</p>
      </div>
    </div>
  `;

  const adminHtml = `
    <p><strong>NEW BOOKING</strong></p>
    <p>Ref: ${b.id}<br>Experience: ${b.exp_title}<br>Date: ${b.date}<br>
    Guests: ${b.adults}a${b.children ? '+' + b.children + 'c' : ''}<br>
    Client: ${b.name} / ${b.email} / ${b.phone}<br>
    Total: ${Number(b.total).toLocaleString()} MAD</p>
  `;

  await Promise.all([
    send(b.email, `Booking Confirmation — ${b.id}`, clientHtml),
    send(ADMIN_EMAIL, `[New Booking] ${b.id} — ${b.exp_title}`, adminHtml)
  ]);
}

async function sendContactNotification(m) {
  const html = `
    <p><strong>New Contact Message</strong></p>
    <p>From: ${m.fname} ${m.lname || ''} &lt;${m.email}&gt;</p>
    ${m.phone ? `<p>Phone: ${m.phone}</p>` : ''}
    ${m.subject ? `<p>Subject: ${m.subject}</p>` : ''}
    <p>${m.message}</p>
  `;
  await send(ADMIN_EMAIL, `[Contact] ${m.subject || 'New message'} — ${m.fname}`, html);
}

async function sendPlanRequest(r) {
  const html = `
    <p><strong>New Plan My Trip Request</strong></p>
    <p>Ref: ${r.id}<br>
    From: ${r.fname} / ${r.email} / ${r.phone}<br>
    Segment: ${r.segment || '—'}<br>
    Group: ${r.groupSize || '—'}<br>
    Duration: ${r.duration || '—'}<br>
    Budget: ${r.budget || '—'}<br>
    Message: ${r.message || '—'}</p>
  `;
  await send(ADMIN_EMAIL, `[Plan My Trip] ${r.id} — ${r.fname}`, html);
}

async function sendTeamRequest(r) {
  const html = `
    <p><strong>New Team Building Request</strong></p>
    <p>Ref: ${r.id}<br>
    Company: ${r.company}<br>
    Contact: ${r.contactFn} ${r.contactLn || ''} / ${r.email} / ${r.phone}<br>
    Group: ${r.groupSize || '—'}<br>
    Programs: ${(r.programs || []).join(', ') || '—'}<br>
    Budget: ${r.budget || '—'}</p>
  `;
  await send(ADMIN_EMAIL, `[Team Building] ${r.id} — ${r.company}`, html);
}

module.exports = { sendBookingConfirmation, sendContactNotification, sendPlanRequest, sendTeamRequest };
