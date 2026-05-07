const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const db     = require('../database');
const mailer = require('../mailer');

router.post('/contact', function(req, res) {
  var f = req.body;
  if (!f.fname||!f.email||!f.message) return res.status(400).json({ error:'Name, email and message required' });
  var doc = db.contacts.insert({ id:uuidv4(), fname:f.fname, lname:f.lname||'', email:f.email, phone:f.phone||'', subject:f.subject||'', message:f.message, status:'unread', created:new Date().toISOString() });
  mailer.sendContactNotification(doc).catch(function(){});
  res.status(201).json({ message:'Message sent', id:doc.id });
});

router.post('/plan', function(req, res) {
  var f = req.body;
  if (!f.fname||!f.email||!f.phone) return res.status(400).json({ error:'Name, email and phone required' });
  var id = 'RC-PLAN-'+Math.random().toString(36).substr(2,4).toUpperCase();
  var doc = db.plans.insert({
    id:id,
    segment:f.segment||'',
    moods:f.moods||[],
    who:f.who||'',
    destination:f.destination||'',
    groupSize:f.groupSize||'',
    duration:f.duration||'',
    budget:f.budget||'',
    lang:f.lang||'',
    dateFrom:f.dateFrom||'',
    dateTo:f.dateTo||'',
    departCity:f.departCity||'',
    fname:f.fname, lname:f.lname||'', email:f.email, phone:f.phone,
    source:f.source||'', message:f.message||'',
    status:'new', created:new Date().toISOString()
  });
  mailer.sendPlanRequest(doc).catch(function(){});
  res.status(201).json({ message:'Plan request submitted', ref:id });
});

router.post('/team', function(req, res) {
  var f = req.body;
  if (!f.company||!f.email||!f.phone||!f.contactFn) return res.status(400).json({ error:'Company, contact, email and phone required' });
  var id = 'RC-TB-'+Math.random().toString(36).substr(2,4).toUpperCase();
  var doc = db.teams.insert({
    id:id, company:f.company, industry:f.industry||'', corpSize:f.corpSize||'', city:f.city||'',
    contactFn:f.contactFn, contactLn:f.contactLn||'', contactRole:f.contactRole||'',
    email:f.email, phone:f.phone,
    groupSize:f.groupSize||'', groupExact:parseInt(f.groupExact)||0,
    duration:f.duration||'', location:f.location||'',
    programs:f.programs||[], objectives:f.objectives||[], budget:f.budget||'',
    dateFrom:f.dateFrom||'', dateTo:f.dateTo||'', flexDate:!!f.flexDate,
    needs:f.needs||[], notes:f.notes||'',
    status:'new', created:new Date().toISOString()
  });
  mailer.sendTeamRequest(doc).catch(function(){});
  res.status(201).json({ message:'Team request submitted', ref:id });
});

module.exports = router;
