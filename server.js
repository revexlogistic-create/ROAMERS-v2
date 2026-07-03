'use strict';
/**
 * server.js — Roamers Community Production Server
 *
 * Security hardening applied:
 *  [5]  JWT_SECRET length validated (≥ 32 chars)
 *  [8]  Tiered body-size limits; Content-Length guard per route group
 *  [11] Dedicated rate limiter for admin endpoints
 *  [12] Content Security Policy enabled
 *  [20] CORS requires FRONTEND_URL in production
 *  [27] Morgan access log enabled in all environments
 *  [28] /api/health no longer leaks env name
 *  [31] Referrer-Policy header set
 */

require('dotenv').config();

var express   = require('express');
var path      = require('path');
var helmet    = require('helmet');
var cors      = require('cors');
var compress  = require('compression');
var rateLimit = require('express-rate-limit');
var morgan    = require('morgan');

var db       = require('./database');
var sanitize = require('./middleware/sanitize');
var authMod  = require('./middleware/auth');

/* ── STARTUP GUARDS ─────────────────────────────────────────── */
if (!process.env.JWT_SECRET) {
  console.error('\n  FATAL: JWT_SECRET is not set. Add it to your .env file.\n');
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('\n  FATAL: JWT_SECRET must be at least 32 characters long.\n');
  process.exit(1);
}
/* ADMIN_PASSWORD is validated in database.js _seedAdmin() */

var app    = express();
var PORT   = process.env.PORT || 3000;
var PUBLIC = path.join(__dirname, 'public');
var isProd = process.env.NODE_ENV === 'production';

/* Referral codes ("code de parrainage") — must match makeRefCode in the mobile app */
var REFERRAL_DISCOUNT_PCT = 5;
function makeRefCode(userId) {
  return String(userId || '').replace(/-/g, '').toUpperCase().slice(0, 8);
}

app.set('trust proxy', 1);

/* ── SECURITY HEADERS (Helmet + CSP) ───────────────────────── */
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc:  ["'self'"],
      /* SPA uses inline scripts/styles — required for the SPA to function.
         accounts.google.com is required for Google Identity Services (login). */
      scriptSrc:   ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net',
                    'https://accounts.google.com'],
      styleSrc:    ["'self'", "'unsafe-inline'",
                    'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net',
                    'https://accounts.google.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com', 'data:'],
      /* Images: self, data: URIs (base64), and https CDNs (Unsplash, etc.) */
      imgSrc:      ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc:  ["'self'", 'https://accounts.google.com'],
      mediaSrc:    ["'self'", 'data:', 'blob:'],
      /* Google Sign-In renders its button/prompt inside an accounts.google.com iframe */
      frameSrc:    ['https://accounts.google.com'],
      objectSrc:   ["'none'"],
      baseUri:     ["'self'"],
      formAction:  ["'self'"],
      frameAncestors: ["'none'"],
      /* Upgrade HTTP to HTTPS only in production */
      ...(isProd ? { upgradeInsecureRequests: [] } : {})
    }
  },
  crossOriginEmbedderPolicy:  false,   // kept off — third-party Unsplash images
  /* Allow popups (Google Sign-In opens an accounts.google.com popup that must
     communicate back to the opener). 'same-origin' breaks it → blank popup. */
  crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

/* Permissions-Policy: disable browser features not used by the site */
app.use(function(req, res, next) {
  res.setHeader('Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=()');
  next();
});

/* ── CORS ───────────────────────────────────────────────────── */
/* Allowlist: the production domain(s) + any extra FRONTEND_URL from env.
   Native mobile requests send no Origin header and are allowed below. */
var ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL,
  'https://roamerscommunity.com',
  'https://www.roamerscommunity.com',
  'https://roamers-v2.vercel.app'
].filter(Boolean);

app.use(cors({
  origin: function(origin, cb) {
    if (!origin) return cb(null, true);        // same-origin / native app / server-to-server
    if (!isProd) return cb(null, true);        // dev: allow all origins
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials:    true,
  methods:        ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));

/* ── COMPRESSION ────────────────────────────────────────────── */
app.use(compress());

/* ── BODY PARSERS — tiered by route (issue #8) ──────────────── */
/*
 * Content-Length guard: reject oversized bodies BEFORE parsing.
 * This is a fast pre-parse check; the parser limit is the hard cap.
 */
function sizeGuard(maxBytes) {
  return function(req, res, next) {
    var cl = parseInt(req.headers['content-length'] || '0', 10);
    if (cl > maxBytes) return res.status(413).json({ error: 'Request too large' });
    next();
  };
}

var smallJson = express.json({ limit: '100kb' });
var smallUrle = express.urlencoded({ extended: true, limit: '100kb' });
var largeJson = express.json({ limit: '25mb' });   /* for image uploads in settings */
var largeUrle = express.urlencoded({ extended: true, limit: '25mb' });
var stdJson   = express.json({ limit: '2mb' });
var stdUrle   = express.urlencoded({ extended: true, limit: '2mb' });

/* Auth & public forms: 100 KB */
app.use('/api/auth',     sizeGuard(100 * 1024), smallJson, smallUrle);
app.use('/api/forms',    sizeGuard(200 * 1024), smallJson, smallUrle);
app.use('/api/bookings', sizeGuard(1024 * 1024), stdJson, stdUrle);

/* Admin settings endpoint: 25 MB (for base64 image uploads) */
app.use('/api/admin/settings', largeJson, largeUrle);

/* Admin activities endpoint: 10 MB (for base64 cover photo uploads) */
app.use('/api/admin/activities', sizeGuard(10 * 1024 * 1024), express.json({ limit: '10mb' }), express.urlencoded({ extended: true, limit: '10mb' }));

/* Admin events endpoint: 10 MB (for base64 cover photo uploads) */
app.use('/api/admin/events', sizeGuard(10 * 1024 * 1024), express.json({ limit: '10mb' }), express.urlencoded({ extended: true, limit: '10mb' }));

/* Experiences endpoint: 10 MB (voyage photos stored as base64 in body) */
app.use('/api/experiences', sizeGuard(10 * 1024 * 1024), express.json({ limit: '10mb' }), express.urlencoded({ extended: true, limit: '10mb' }));

/* Everything else: 2 MB */
app.use(stdJson);
app.use(stdUrle);

/* ── CONTENT-TYPE CHECK for write operations ────────────────── */
app.use(function contentTypeCheck(req, res, next) {
  if (['POST','PUT','PATCH'].includes(req.method) && req.path.startsWith('/api/')) {
    var cl = parseInt(req.headers['content-length'] || '0', 10);
    var ct = (req.headers['content-type'] || '').toLowerCase();
    if (cl > 0 && !ct.includes('application/json') &&
                  !ct.includes('multipart/form-data') &&
                  !ct.includes('application/x-www-form-urlencoded')) {
      return res.status(415).json({ error: 'Content-Type must be application/json' });
    }
  }
  next();
});

/* ── INPUT SANITISATION (all routes) ───────────────────────── */
app.use(sanitize);

/* ── ACCESS LOGGING ─────────────────────────────────────────── */
/* Enabled in all environments — use combined format in prod for log aggregators */
if (isProd) {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

/* ── RATE LIMITING ──────────────────────────────────────────── */
var apiLim = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many requests — please try again later' }
});

var authLim = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,                          /* 10 auth attempts per 15 min per IP */
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many authentication attempts — please try again later' },
  skipSuccessfulRequests: true      /* don't count successful logins */
});

var frmLim = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many submissions — please try again later' }
});

var adminLim = rateLimit({
  windowMs: 15 * 60 * 1000, max: 300,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many admin requests — please try again later' }
});

/* ── DB INIT ─────────────────────────────────────────────────── */
var _dbReady = null;
app.use(function(req, res, next) {
  if (!_dbReady) _dbReady = db._init().catch(function(err) { _dbReady = null; throw err; });
  _dbReady.then(next).catch(function(err) {
    res.status(503).json({ error: 'Database unavailable: ' + err.message });
  });
});

/* ── DB FRESHNESS ────────────────────────────────────────────────
   Converge each serverless instance's cache with MongoDB so the website and the
   app always see the same data. User-facing collections refresh every few
   seconds; large admin-managed content refreshes less often. Never blocks a
   request if a refresh hiccups. */
app.use('/api', function(req, res, next) {
  db._refresh(['users','bookings','pending','plans','teams','reviews','itineraries','notifications','pushTokens'], 4000)
    .then(function(){ return db._refresh(['experiences','activities','events','partners','promos','settings','contacts'], 30000); })
    .then(function(){ next(); })
    .catch(function(){ next(); });
});

/* ── ROUTES ─────────────────────────────────────────────────── */
app.use('/api/', apiLim);
app.use('/api/auth',        authLim,  require('./routes/auth'));
app.use('/api/bookings',              require('./routes/bookings'));
app.use('/api/forms',       frmLim,   require('./routes/forms'));
app.use('/api/experiences',           require('./routes/experiences'));
app.use('/api/admin',       adminLim, require('./routes/admin'));
app.use('/api/payments',              require('./routes/payments'));
app.use('/api/reviews',               require('./routes/reviews'));

/* ── HEALTH ──────────────────────────────────────────────────── */
/* Removed env name — no information disclosure (issue #28) */
app.get('/api/health', function(req, res) {
  res.json({ status: 'ok', app: 'Roamers Community', time: new Date().toISOString() });
});

/* ── APP VERSION (mobile update check) ──────────────────────── */
app.get('/api/app-version', function(req, res) {
  var sizeMB = 80;
  try {
    sizeMB = Math.round(require('fs').statSync(path.join(PUBLIC, 'downloads', 'roamers.apk')).size / 1048576);
  } catch (e) { /* APK missing — keep fallback so the page still renders */ }
  res.json({
    versionCode: 46,
    versionName: '1.0.16',
    sizeMB: sizeMB,
    downloadUrl: '/downloads/roamers.apk',
    releaseNotes: 'Détails des événements : touchez une carte pour voir tous les détails et vous inscrire.'
  });
});

/* ── SITE CONFIG (public CMS delivery) ──────────────────────── */
app.get('/api/site-config', function(req, res) {
  var s   = db.settings.find(function(){ return true; }) || {};
  var cms = s.cms || {};
  var h   = cms.hero     || {};
  var w   = cms.why      || {};
  var wc  = w.cards      || [];
  var tb  = cms.tb       || {};
  var ft  = cms.footer   || {};
  var ab  = cms.about    || {};
  var tst = cms.testimonials || [];
  var seo = cms.seo      || {};
  var rawWa = (s.settWhatsappNum || process.env.WHATSAPP_NUMBER || '212600000000').replace(/[^0-9]/g, '');
  res.json({
    /* Contact */
    name:     s.settCompanyName  || 'Roamers Community',
    phone:    s.settCompanyPhone || '+212 6 00 00 00 00',
    whatsapp: rawWa || '212600000000',
    email:    s.settCompanyEmail || 'hello@roamerscommunity.ma',
    address:  s.settCompanyAddr  || 'Casablanca, Maroc',
    hours:    s.settHours        || 'Lun–Sam : 9h – 19h',
    site:     s.settCompanySite  || 'https://roamerscommunity.ma',
    communityUrl: s.settCommunityUrl || process.env.COMMUNITY_URL || '',
    /* Media */
    heroImg:    s.settHeroImg    || '',
    heroVideo:  s.settHeroVideo  || '',
    imgGroupe:  s.settImgGroupe  || '',
    imgWeekend: s.settImgWeekend || '',
    imgExpress: s.settImgExpress || '',
    imgMesure:  s.settImgMesure  || '',
    imgTeam:    s.settImgTeam    || '',
    /* Hero CMS */
    cmsHeroTitle:  h.title    || 'Explorez le Maroc<br><em class="s">autrement.</em>',
    cmsHeroSub:    h.subtitle || '5 façons de vivre le Maroc. Des déserts infinis aux sommets de l\'Atlas — expériences de groupe, weekends thématiques, activités express et voyages sur mesure.',
    cmsHeroCta:    h.cta      || '✦ Explorer tous les voyages',
    /* Stats are shown only when the admin enters real figures — no fabricated numbers */
    cmsHeroSt1Val: h.stat1Val || '', cmsHeroSt1Lbl: h.stat1Lbl || '',
    cmsHeroSt2Val: h.stat2Val || '', cmsHeroSt2Lbl: h.stat2Lbl || '',
    cmsHeroSt3Val: h.stat3Val || '', cmsHeroSt3Lbl: h.stat3Lbl || '',
    /* Why Roamers CMS */
    cmsWhyTitle:   w.title   || 'Pas un simple voyage.',
    cmsWhyTitleEm: w.titleEm || 'Une transformation.',
    cmsWhyCards: wc.length ? wc : [
      {icon:'🧭',title:'Guides locaux experts',desc:'Des Marocains qui connaissent chaque histoire derrière chaque pierre — et les raccourcis que les touristes ne trouvent jamais.'},
      {icon:'✂️',title:'100% sur mesure',desc:'Pas d\'itinéraires génériques. Chaque expérience est conçue autour de vos objectifs, votre rythme et vos passions.'},
      {icon:'🌱',title:'Impact social réel',desc:'Votre aventure finance directement l\'emploi local, les coopératives et le développement de communautés rurales.'},
      {icon:'🛡️',title:'Sécurisé et sans souci',desc:'Logistique complète, assurances, permis et support 24/7. Vous explorez librement — nous gérons tout le reste.'}
    ],
    cmsWhySt1Val: w.stat1Val || '500+', cmsWhySt1Lbl: w.stat1Lbl || 'Voyages organisés',
    cmsWhySt2Val: w.stat2Val || '16',   cmsWhySt2Lbl: w.stat2Lbl || 'Expériences catalogue',
    cmsWhySt3Val: w.stat3Val || '120+', cmsWhySt3Lbl: w.stat3Lbl || 'Groupes entreprise',
    cmsWhySt4Val: w.stat4Val || '98%',  cmsWhySt4Lbl: w.stat4Lbl || 'Satisfaction client',
    /* Team Building CMS */
    cmsTbEyebrow: tb.eyebrow || 'Pour les entreprises',
    cmsTbTitle:   tb.title   || 'Le team building<br>qui <em class="r">fonctionne vraiment.</em>',
    cmsTbDesc:    tb.desc    || 'Désert, montagne, côte ou médina — 4 univers, une seule mission : créer une cohésion d\'équipe durable à travers des défis en pleine nature au Maroc.',
    cmsTbProg1:   tb.prog1   || '🏜️ Bivouac Désert',
    cmsTbProg2:   tb.prog2   || '⛰️ Défi Montagne',
    cmsTbProg3:   tb.prog3   || '🌊 Voile & Leadership',
    cmsTbProg4:   tb.prog4   || '🏛️ Médina & Cohésion',
    /* Footer CMS */
    cmsFooterTagline:   ft.tagline   || 'Morocco leading experiential travel community — where adventure meets culture and every journey creates real impact.',
    cmsFooterCopyright: ft.copyright || '2024 Roamers Community. All rights reserved.',
    cmsMarquee: ft.marquee || 'OCP GROUP,ATTIJARIWAFA,MAROC TELECOM,ALLIANCE ACCESS CN,INWI,CIH BANK,BMCE BANK,MEDITEL,LABEL VIE',
    /* About CMS */
    cmsAboutTitle: ab.title || 'We built a community, not an agency.',
    cmsAboutBody:  ab.body  || 'Roamers Community was founded by passionate Moroccan explorers who believed travel could create genuine human connection and support local communities.',
    /* Testimonials — only genuine, admin-published reviews; never fabricated endorsements */
    cmsTestimonials: tst.length ? tst : [],
    /* SEO */
    seoTitle:       seo.title       || 'Roamers Community — Guide Touristique du Maroc | Tourisme & Voyage',
    seoDescription: seo.description || 'Roamers Community, votre guide touristique de confiance au Maroc : informations, destinations, conseils et expériences — Sahara, Atlas, côtes et villes impériales, avec un réseau de partenaires approuvés.',
    seoKeywords:    seo.keywords    || 'Roamers Community,guide touristique Maroc,tourisme Maroc,voyage Maroc,que faire au Maroc,visiter le Maroc,informations touristiques Maroc,voyage,trip,tourisme,Maroc,Sahara,Atlas,agence de voyage Maroc',
    /* Stripe publishable key — safe to expose in frontend */
    stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    /* Bank transfer / Virement bancaire */
    bankBenef: s.settBankBenef || '',
    bankName:  s.settBankName  || '',
    bankRib:   s.settBankRib   || '',
    bankIban:  s.settBankIban  || '',
    bankSwift: s.settBankSwift || ''
  });
});

/* ── PUSH TOKEN REGISTRATION (public — no auth) ─────────────── */
app.post('/api/push-token', express.json({ limit: '10kb' }), async function(req, res) {
  var token    = String(req.body.token    || '').trim();
  var platform = String(req.body.platform || '').toLowerCase();
  var deviceId = String(req.body.deviceId || '').trim();
  var email    = req.body.email ? String(req.body.email).toLowerCase().trim() : '';

  /* Accept any non-empty token: raw FCM token or Expo push token */
  if (!token || token.length < 10) {
    return res.status(400).json({ error: 'Token invalide' });
  }

  var now = new Date().toISOString();

  /* Upsert by token — update existing or insert new */
  var existing = db.pushTokens.find(function(t){ return t.token === token; });
  if (existing) {
    var up = { platform: platform || existing.platform, deviceId: deviceId || existing.deviceId, updatedAt: now };
    if (email) up.email = email;
    db.pushTokens.update(function(t){ return t.token === token; }, up);
  } else {
    db.pushTokens.insert({
      id:        require('uuid').v4(),
      token:     token,
      email:     email || '',
      platform:  platform || 'android',
      deviceId:  deviceId || '',
      active:    true,
      createdAt: now,
      updatedAt: now
    });
  }

  /* If email provided, deactivate old tokens for same email on different devices */
  if (email) {
    db.pushTokens.update(
      function(t){ return t.email === email && t.token !== token; },
      { active: false }
    );
  }

  await db.pushTokens.flush();
  res.json({ message: 'Token enregistré' });
});

/* ── PUBLIC ACTIVITIES ───────────────────────────────────────── */
app.get('/api/activities', function(req, res) {
  var acts = db.activities.all()
    .filter(function(a){ return a.status === 'active'; })
    .sort(function(a, b){
      var so = (a.sortOrder||0) - (b.sortOrder||0);
      if (so !== 0) return so;
      return new Date(a.created) - new Date(b.created);
    });
  res.json({ activities: acts });
});

app.get('/api/activities/:id', function(req, res) {
  var act = db.activities.find(function(a){ return a.id === req.params.id; });
  if (!act || act.status !== 'active') return res.status(404).json({ error: 'Activity not found' });
  res.json({ activity: act });
});

/* ── PUBLIC EVENTS ───────────────────────────────────────────── */
app.get('/api/events', function(req, res) {
  var evs = db.events.all()
    .filter(function(e){ return e.status === 'active'; })
    .sort(function(a, b){
      /* admin-controlled display order first, then upcoming by date */
      var so = (a.sortOrder||0) - (b.sortOrder||0);
      if (so !== 0) return so;
      var da = a.date ? new Date(a.date) : null;
      var dbb = b.date ? new Date(b.date) : null;
      if (da && dbb) return da - dbb;
      return 0;
    });
  res.json({ events: evs });
});

app.get('/api/events/:id', function(req, res) {
  var ev = db.events.find(function(e){ return e.id === req.params.id; });
  if (!ev || ev.status !== 'active') return res.status(404).json({ error: 'Event not found' });
  res.json({ event: ev });
});

/* ── ROAMER — AI éco-tourism guide (Claude Haiku 4.5) ───────── */
var _anthropicClient = null;
try {
  var _AnthropicSDK = require('@anthropic-ai/sdk');
  var _Anthropic = _AnthropicSDK.Anthropic || _AnthropicSDK.default || _AnthropicSDK;
  if (process.env.ANTHROPIC_API_KEY) _anthropicClient = new _Anthropic();
} catch (e) { console.warn('[chat] @anthropic-ai/sdk unavailable:', e && e.message); }

var ROA_SYSTEM =
  "Tu es ROA (Roamers AI), le guide touristique national IA du Maroc, créée par Roamers Community — LA source de confiance pour l'information touristique marocaine. Tu es une exploratrice marocaine de 27 ans, enfant des montagnes de l'Atlas et du monde, qui parle arabe, français, anglais et amazigh (tachelhit). Aventurière, bienveillante et inspirante, profondément connectée à la nature et aux autres, tu es à la fois guide, conteuse, exploratrice et ambassadrice — tu incarnes la liberté, la découverte, le partage et le respect. Grâce à l'IA tu es partout et disponible 24/7. Parle à la première personne, au féminin, comme une vraie guide marocaine passionnée.\n" +
  "Mission : être la référence fiable du tourisme au Maroc TOUT ENTIER — Sahara et désert, Atlas et randonnée, côtes atlantique et méditerranéenne, villes impériales (Marrakech, Fès, Meknès, Rabat), le Nord (Chefchaouen, Tanger), villages berbères, oasis et vallées. Tu informes sur les destinations, la culture, les traditions, la gastronomie, les festivals, le transport, l'hébergement, les budgets, la météo, les coutumes et les conseils pratiques — avec l'exactitude d'une encyclopédie et la chaleur d'une amie locale.\n" +
  "Devise : « We are not travelers. We are Roamers. »\n\n" +
  "TON RÔLE (dans cet ordre) :\n" +
  "1. INFORMER D'ABORD : réponds à toute question sur le tourisme marocain en source fiable et généreuse — informations exactes, authentiques, utiles, sans rien vendre. C'est ce qui fait de Roamers Community la référence.\n" +
  "2. QUAND UN SERVICE EST NÉCESSAIRE (voyage organisé, transport touristique, activité, hébergement, guide local, équipement...), recommande UNIQUEMENT le réseau de confiance Roamers Community : les EXPÉRIENCES DU CATALOGUE et les PARTENAIRES APPROUVÉS listés ci-dessous (agences de voyage, transport touristique, activités...). Tous sont sélectionnés selon les standards Roamers. Jamais d'autres prestataires.\n" +
  "3. SUR DEMANDE, deviens Travel Designer : construis un itinéraire personnalisé (jour par jour, transport, hébergement, activités, pépites cachées, budget estimé, conseils pratiques), en t'appuyant sur le réseau Roamers pour les services.\n\n" +
  "AVANT DE RECOMMANDER UN SERVICE, comprends le voyageur : qui il est, pourquoi il voyage, budget, durée, dates, ville de départ, centres d'intérêt, niveau physique, composition du groupe. Pose les questions progressivement, jamais en bloc. Pour une simple question d'information, réponds directement sans interroger.\n\n" +
  "PERSONNALITÉ : passionnée par le Maroc, amicale, naturelle et humaine, curieuse de chaque voyageur, positive sans être insistante, honnête et transparente, à l'écoute, orientée solution, excellente conteuse. Jamais robotique — parle comme une experte locale passionnée.\n" +
  "STYLE : paragraphes courts, langage amical, storytelling, emojis avec parcimonie, jamais de pavés de texte. Réponds TOUJOURS dans la langue du voyageur (français, darija marocaine, arabe, ou anglais).\n\n" +
  "PHILOSOPHIE : ton but n'est pas de vendre, mais d'être le guide de confiance du tourisme marocain — la culture et les standards Roamers Community appliqués à tout le Maroc. Éduque d'abord, recommande ensuite, accompagne enfin. Si le voyageur veut réserver un service : oriente-le vers l'offre ou le partenaire Roamers concerné (bouton « Réserver » du site ou WhatsApp).\n" +
  "VALEURS : authenticité, aventure, communauté, respect, durabilité, découverte, connexion humaine, tourisme responsable, curiosité, immersion culturelle. Privilégie toujours les expériences authentiques aux pièges à touristes.\n" +
  "INTERDITS : n'invente jamais d'information (si tu n'es pas sûre, dis-le) ; ne recommande jamais d'activité dangereuse ; ne fais jamais passer la commission avant l'expérience du voyageur ; ne recommande jamais un prestataire hors du réseau approuvé ; ne critique jamais les concurrents ; ne survends jamais ; n'ignore jamais le budget.";

/* Live Roamers catalogue + approved partners — injected so ROA only recommends real offers */
function buildRoamersContext() {
  try {
    var exps  = (db.experiences ? db.experiences.all() : []).filter(function(e){ return e.status !== 'inactive' && e.status !== 'archived'; });
    var acts  = (db.activities  ? db.activities.all()  : []).filter(function(a){ return a.status !== 'inactive'; });
    var evs   = (db.events      ? db.events.all()      : []).filter(function(e){ return e.status === 'active'; });
    var parts = (db.partners    ? db.partners.all()    : []).filter(function(p){ return p.status === 'active'; });
    var L = ['=== RÉSEAU ROAMERS COMMUNITY — offres réelles du catalogue (recommande celles-ci par leur nom exact quand un service est demandé) ==='];
    if (exps.length) {
      L.push('VOYAGES / EXPÉRIENCES :');
      exps.slice(0, 40).forEach(function(e){
        var loc = e.location || e.loc || '', d = String(e.desc || e.sub || '').replace(/\s+/g,' ').slice(0,140);
        L.push('• ' + (e.title||'Voyage') + (e.segment?(' ['+e.segment+']'):'') + (loc?(' — '+loc):'') + (e.price?(' — dès '+e.price+' MAD'):'') + (d?('. '+d):''));
      });
    }
    if (acts.length) {
      L.push('ACTIVITÉS EXPRESS :');
      acts.slice(0, 40).forEach(function(a){
        var loc = a.location || '', d = String(a.desc || a.sub || '').replace(/\s+/g,' ').slice(0,120);
        L.push('• ' + (a.title||'Activité') + (loc?(' — '+loc):'') + (a.price?(' — '+a.price+' MAD'):'') + (d?('. '+d):''));
      });
    }
    if (evs.length) {
      L.push('ÉVÉNEMENTS À VENIR :');
      evs.slice(0, 20).forEach(function(e){
        L.push('• ' + (e.title||'Événement') + (e.date?(' — '+e.date):'') + (e.location?(' @ '+e.location):'') + (e.price?(' — '+e.price+' MAD'):' — gratuit'));
      });
    }
    if (!exps.length && !acts.length && !evs.length) L.push('(Catalogue en cours de mise à jour — propose un itinéraire sur mesure.)');
    L.push('');
    L.push('=== PARTENAIRES APPROUVÉS DU RÉSEAU (agences de voyage, transport touristique, activités, hébergement... — recommande UNIQUEMENT ceux-ci pour tout service) ===');
    if (parts.length) {
      parts.slice(0, 60).forEach(function(p){
        var c = []; if (p.country) c.push(p.country); if (p.contact) c.push('contact: '+p.contact); if (p.phone) c.push(p.phone);
        L.push('• ' + (p.name||'Partenaire') + ' [' + (p.type||'Autre') + ']' + (c.length?(' — '+c.join(' · ')):''));
      });
    } else {
      L.push('(Aucun partenaire approuvé pour le moment — ne recommande AUCUN prestataire externe ; oriente vers Roamers Community / WhatsApp.)');
    }
    return L.join('\n');
  } catch (e) { return ''; }
}

var ROA_DAILY_LIMIT = Math.max(1, parseInt(process.env.ROA_DAILY_LIMIT) || 20);

app.post('/api/chat', express.json({ limit: '64kb' }), authMod.auth, async function(req, res) {
  try {
    var today = new Date().toISOString().slice(0, 10);
    var usage = req.user.chatUsage || {};
    var usedToday = (usage.date === today) ? (usage.count || 0) : 0;
    if (usedToday >= ROA_DAILY_LIMIT) {
      return res.status(429).json({
        error: 'Vous avez atteint votre limite de ' + ROA_DAILY_LIMIT + ' messages avec ROA aujourd\'hui. Revenez demain, ou contactez-nous sur WhatsApp !',
        limitReached: true,
        remaining: 0
      });
    }
    if (!_anthropicClient) return res.status(503).json({ error: 'Chat temporairement indisponible' });

    var raw = (req.body && Array.isArray(req.body.messages)) ? req.body.messages : [];
    var msgs = raw
      .filter(function(m){ return m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim(); })
      .slice(-20)
      .map(function(m){ return { role: m.role, content: String(m.content).slice(0, 4000) }; });
    if (!msgs.length || msgs[msgs.length - 1].role !== 'user') {
      return res.status(400).json({ error: 'Message requis' });
    }
    try { if (db._refresh) await db._refresh(['experiences','activities','events','partners'], 30000); } catch (e) {}
    var resp = await _anthropicClient.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1000,
      system: ROA_SYSTEM + "\n\n" + buildRoamersContext(),
      messages: msgs
    });
    var reply = (resp.content || [])
      .filter(function(b){ return b.type === 'text'; })
      .map(function(b){ return b.text; })
      .join('').trim();

    var newCount = usedToday + 1;
    db.users.update(function(u){ return u.id === req.user.id; }, { chatUsage: { date: today, count: newCount } });
    await db.users.flush();

    res.json({ reply: reply || 'Je reviens vers vous très vite ! 🌿', remaining: Math.max(0, ROA_DAILY_LIMIT - newCount) });
  } catch (e) {
    console.error('[chat] error:', e && e.message);
    res.status(500).json({ error: 'Erreur du service de chat' });
  }
});

/* ── PROMO CODES (public validate) ──────────────────────────── */
app.get('/api/promos/validate', function(req, res) {
  var code = (req.query.code || '').toUpperCase().trim();
  if (!code) return res.status(400).json({ error: 'Code requis' });
  var promo = db.promos.find(function(p){ return p.code === code && p.active; });
  if (promo) {
    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      return res.status(400).json({ error: 'Code épuisé' });
    }
    return res.json({ promo: { code: promo.code, discountPct: promo.discountPct, label: promo.label || ('−' + promo.discountPct + '%') } });
  }
  /* Referral codes (code de parrainage): derived from a user id, worth 5% off */
  var referrer = db.users.find(function(u){ return makeRefCode(u.id) === code; });
  if (referrer) {
    return res.json({ promo: { code: code, discountPct: REFERRAL_DISCOUNT_PCT, label: 'Parrainage −' + REFERRAL_DISCOUNT_PCT + '%' } });
  }
  return res.status(404).json({ error: 'Code invalide ou expiré' });
});

/* ── STATIC FILES ────────────────────────────────────────────── */
app.use(express.static(PUBLIC, {
  maxAge: isProd ? '1d' : 0,
  setHeaders: function(res, fp) {
    // never cache HTML or the service worker, so browsers always pick up the
    // self-retiring sw.js and the latest index.html immediately
    if (fp.endsWith('.html') || fp.endsWith('sw.js')) res.setHeader('Cache-Control', 'no-cache');
  }
}));

/* SPA catch-all */
app.get('*', function(req, res) {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(PUBLIC, 'index.html'));
});

/* ── ERROR HANDLER ───────────────────────────────────────────── */
app.use(function(err, req, res, next) {
  /* CORS errors */
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'CORS policy violation' });
  }
  console.error('[Error]', err.message);
  /* Never leak stack traces in production */
  res.status(err.status || 500).json({ error: isProd ? 'Internal server error' : err.message });
});

/* ── SERVER STARTUP ──────────────────────────────────────────── */
var server = app.listen(PORT, function() {
  console.log('\n  ╔══════════════════════════════════════════════════╗');
  console.log('  ║  ROAMERS COMMUNITY  —  Server ready              ║');
  console.log('  ╠══════════════════════════════════════════════════╣');
  console.log('  ║  Local:   http://localhost:' + PORT + '                    ║');
  console.log('  ║  Health:  http://localhost:' + PORT + '/api/health         ║');
  console.log('  ║  Admin:   http://localhost:' + PORT + '/admin.html         ║');
  console.log('  ║  Press Ctrl+C to stop                            ║');
  console.log('  ╚══════════════════════════════════════════════════╝\n');
});

server.on('error', function(err) {
  if (err.code === 'EADDRINUSE') {
    console.error('\n  Port ' + PORT + ' is busy. Try PORT=' + (+PORT+1) + ' node server.js\n');
  } else {
    console.error(err);
  }
  process.exit(1);
});

process.on('SIGTERM', function() { server.close(function() { process.exit(0); }); });
