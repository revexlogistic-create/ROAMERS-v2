'use strict';
/**
 * routes/forms.js — Contact, Plan My Trip, Team Building forms
 *
 * Security hardening applied:
 *  [8]  Field length limits enforced on all free-text fields
 *  [24] Email validated with regex on all form routes
 *  [33] consentGiven field recorded for Law 09-08 compliance
 */

var router   = require('express').Router();
var uuidv4   = require('uuid').v4;
var db       = require('../database');
var mailer   = require('../mailer');
var authMw   = require('../middleware/auth');
var validate = require('../middleware/validate');
var audit    = require('../middleware/audit');
var notify   = require('../utils/notify');

var auth = authMw.auth;

/* ── CONTACT FORM ────────────────────────────────────────────── */
router.post('/contact', audit.audit('form:contact'), async function(req, res) {
  var f = req.body || {};

  if (!f.fname || !String(f.fname).trim()) return res.status(400).json({ error: 'Name is required' });
  if (!validate.isEmail(f.email))          return res.status(400).json({ error: 'Valid email address required' });
  if (!f.message || !String(f.message).trim()) return res.status(400).json({ error: 'Message is required' });

  var doc = db.contacts.insert({
    id:             uuidv4(),
    fname:          String(f.fname).trim().slice(0, 100),
    lname:          f.lname ? String(f.lname).trim().slice(0, 100) : '',
    email:          f.email.toLowerCase().trim(),
    phone:          f.phone   ? String(f.phone).trim().slice(0, 30)    : '',
    subject:        f.subject ? String(f.subject).trim().slice(0, 200) : '',
    message:        String(f.message).trim().slice(0, 4000),
    consentGiven:   !!f.consentGiven,
    consentTs:      new Date().toISOString(),
    status:         'unread',
    created:        new Date().toISOString()
  });

  mailer.sendContactNotification(doc).catch(function(){});
  await db.contacts.flush();
  res.status(201).json({ message: 'Message sent', id: doc.id });
});

/* ── PLAN MY TRIP ────────────────────────────────────────────── */
var PLAN_SEGMENTS = ['groupe','weekend','express','mesure',''];
var PLAN_BUDGETS  = ['<3000','3000-5000','5000-10000','>10000',''];

router.post('/plan', audit.audit('form:plan'), async function(req, res) {
  var f = req.body || {};

  if (!f.fname || !String(f.fname).trim()) return res.status(400).json({ error: 'First name is required' });
  if (!validate.isEmail(f.email))          return res.status(400).json({ error: 'Valid email address required' });
  if (!f.phone || !String(f.phone).trim()) return res.status(400).json({ error: 'Phone number is required' });

  var id = 'RC-PLAN-' + uuidv4().replace(/-/g,'').toUpperCase().slice(0,6);

  var doc = db.plans.insert({
    id:              id,
    segment:         PLAN_SEGMENTS.includes(f.segment) ? f.segment : '',
    moods:           Array.isArray(f.moods) ? f.moods.slice(0, 10) : [],
    itineraryStops:  Array.isArray(f.itineraryStops) ? f.itineraryStops.map(function(s){ return String(s).trim().slice(0, 100); }).filter(Boolean).slice(0, 20) : [],
    who:             f.who         ? String(f.who).trim().slice(0, 100)         : '',
    destination:     f.destination ? String(f.destination).trim().slice(0, 200) : '',
    groupSize:       f.groupSize   ? String(f.groupSize).trim().slice(0, 50)    : '',
    duration:        f.duration    ? String(f.duration).trim().slice(0, 50)     : '',
    budget:          f.budget      ? String(f.budget).trim().slice(0, 50)       : '',
    lang:            Array.isArray(f.lang) ? f.lang.slice(0, 10) : (f.lang ? [String(f.lang).trim()] : []),
    needs:           Array.isArray(f.needs) ? f.needs.slice(0, 20) : [],
    flexDate:        !!f.flexDate,
    dateFrom:        f.dateFrom    ? String(f.dateFrom).trim().slice(0, 20)     : '',
    dateTo:          f.dateTo      ? String(f.dateTo).trim().slice(0, 20)       : '',
    departCity:      f.departCity  ? String(f.departCity).trim().slice(0, 100)  : '',
    fname:           String(f.fname).trim().slice(0, 100),
    lname:           f.lname ? String(f.lname).trim().slice(0, 100) : '',
    email:           f.email.toLowerCase().trim(),
    phone:           String(f.phone).trim().slice(0, 30),
    source:          f.source  ? String(f.source).trim().slice(0, 100)  : '',
    message:         f.message ? String(f.message).trim().slice(0, 4000) : '',
    consentGiven:    !!f.consentGiven,
    consentTs:       new Date().toISOString(),
    status:          'new',
    created:         new Date().toISOString()
  });

  mailer.sendPlanRequest(doc).catch(function(){});

  /* Push notification — plan request received */
  notify.notifyByEmail(doc.email, 'plan_request', {
    name: doc.fname,
    ref:  id
  }).catch(function(){});

  await db.plans.flush();
  res.status(201).json({ message: 'Plan request submitted', ref: id });
});

/* ── TEAM BUILDING REQUEST ───────────────────────────────────── */
router.post('/team', audit.audit('form:team-building'), async function(req, res) {
  var f = req.body || {};

  if (!f.company  || !String(f.company).trim()) return res.status(400).json({ error: 'Company name is required' });
  if (!f.contactFn || !String(f.contactFn).trim()) return res.status(400).json({ error: 'Contact first name is required' });
  if (!validate.isEmail(f.email))               return res.status(400).json({ error: 'Valid email address required' });
  if (!f.phone    || !String(f.phone).trim())   return res.status(400).json({ error: 'Phone number is required' });

  var id = 'RC-TB-' + uuidv4().replace(/-/g,'').toUpperCase().slice(0,6);

  var doc = db.teams.insert({
    id:          id,
    company:     String(f.company).trim().slice(0, 200),
    industry:    f.industry    ? String(f.industry).trim().slice(0, 100)    : '',
    corpSize:    f.corpSize    ? String(f.corpSize).trim().slice(0, 50)     : '',
    city:        f.city        ? String(f.city).trim().slice(0, 100)        : '',
    contactFn:   String(f.contactFn).trim().slice(0, 100),
    contactLn:   f.contactLn   ? String(f.contactLn).trim().slice(0, 100)  : '',
    contactRole: f.contactRole ? String(f.contactRole).trim().slice(0, 100) : '',
    email:       f.email.toLowerCase().trim(),
    phone:       String(f.phone).trim().slice(0, 30),
    groupSize:   f.groupSize   ? String(f.groupSize).trim().slice(0, 50)   : '',
    groupExact:  Math.max(0, parseInt(f.groupExact) || 0),
    duration:    f.duration    ? String(f.duration).trim().slice(0, 50)    : '',
    location:    f.location    ? String(f.location).trim().slice(0, 200)   : '',
    programs:    Array.isArray(f.programs)   ? f.programs.slice(0, 20)   : [],
    objectives:  Array.isArray(f.objectives) ? f.objectives.slice(0, 20) : [],
    budget:      f.budget  ? String(f.budget).trim().slice(0, 50)   : '',
    dateFrom:    f.dateFrom ? String(f.dateFrom).trim().slice(0, 20) : '',
    dateTo:      f.dateTo   ? String(f.dateTo).trim().slice(0, 20)   : '',
    flexDate:    !!f.flexDate,
    needs:       Array.isArray(f.needs) ? f.needs.slice(0, 20) : [],
    notes:       f.notes ? String(f.notes).trim().slice(0, 4000) : '',
    consentGiven: !!f.consentGiven,
    consentTs:    new Date().toISOString(),
    status:      'new',
    created:     new Date().toISOString()
  });

  mailer.sendTeamRequest(doc).catch(function(){});

  /* Push notification — team building request received */
  notify.notifyByEmail(doc.email, 'team_request', {
    name:    doc.contactFn,
    company: doc.company,
    ref:     id
  }).catch(function(){});

  await db.teams.flush();
  res.status(201).json({ message: 'Team request submitted', ref: id });
});

/* ── GET MY PLAN REQUESTS (authenticated) ────────────────────── */
router.get('/plan/mine', auth, function(req, res) {
  /* Match on userId if present, fall back to email for pre-auth requests */
  var reqs = db.plans.all()
    .filter(function(p){
      return (p.userId && p.userId === req.user.id) ||
             (!p.userId && p.email === req.user.email);
    })
    .sort(function(a, b){ return new Date(b.created) - new Date(a.created); });
  res.json({ requests: reqs });
});

/* ── CUSTOM ITINERARY (mobile app) ──────────────────────────── */
router.post('/itinerary', audit.audit('form:itinerary'), async function(req, res) {
  var f = req.body || {};

  var stops = Array.isArray(f.stops) ? f.stops : [];
  stops = stops.filter(function(s){ return s && typeof s === 'string'; })
               .map(function(s){ return String(s).trim().slice(0, 100); })
               .filter(Boolean);
  if (stops.length < 2) return res.status(400).json({ error: 'Au moins 2 étapes requises' });
  if (stops.length > 20) return res.status(400).json({ error: 'Maximum 20 étapes' });

  var distKm = f.distanceKm != null ? Math.round(Number(f.distanceKm)) || null : null;
  var durH   = f.durationH  != null ? Math.round(Number(f.durationH))  || null : null;

  var id = 'RC-ITIN-' + uuidv4().replace(/-/g,'').toUpperCase().slice(0, 6);

  var doc = db.itineraries.insert({
    id:          id,
    stops:       stops,
    stopCount:   stops.length,
    distanceKm:  distKm,
    durationH:   durH,
    fname:       f.fname ? String(f.fname).trim().slice(0, 100) : 'Anonyme',
    email:       validate.isEmail(f.email || '') ? String(f.email).toLowerCase().trim() : '',
    note:        f.note  ? String(f.note).trim().slice(0, 500) : '',
    status:      'new',
    created:     new Date().toISOString()
  });

  await db.itineraries.flush();
  res.status(201).json({ message: 'Itinéraire sauvegardé', ref: id });
});

module.exports = router;
