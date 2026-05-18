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

app.set('trust proxy', 1);

/* ── SECURITY HEADERS (Helmet + CSP) ───────────────────────── */
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc:  ["'self'"],
      /* SPA uses inline scripts/styles — required for the SPA to function */
      scriptSrc:   ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net'],
      styleSrc:    ["'self'", "'unsafe-inline'",
                    'https://fonts.googleapis.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com', 'data:'],
      /* Images: self, data: URIs (base64), and https CDNs (Unsplash, etc.) */
      imgSrc:      ["'self'", 'data:', 'blob:', 'https:'],
      connectSrc:  ["'self'"],
      mediaSrc:    ["'self'", 'data:', 'blob:'],
      frameSrc:    ["'none'"],
      objectSrc:   ["'none'"],
      baseUri:     ["'self'"],
      formAction:  ["'self'"],
      frameAncestors: ["'none'"],
      /* Upgrade HTTP to HTTPS only in production */
      ...(isProd ? { upgradeInsecureRequests: [] } : {})
    }
  },
  crossOriginEmbedderPolicy:  false,   // kept off — third-party Unsplash images
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

/* Permissions-Policy: disable browser features not used by the site */
app.use(function(req, res, next) {
  res.setHeader('Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=()');
  next();
});

/* ── CORS ───────────────────────────────────────────────────── */
var ALLOWED_ORIGIN = process.env.FRONTEND_URL || null;

if (isProd && !ALLOWED_ORIGIN) {
  console.warn('\n  WARNING: FRONTEND_URL is not set in production.\n' +
               '  CORS will block cross-origin requests. Set FRONTEND_URL in your .env.\n');
}

app.use(cors({
  origin: function(origin, cb) {
    if (!origin) return cb(null, true);        // same-origin / server-to-server
    if (!isProd) return cb(null, true);        // dev: allow all origins
    if (ALLOWED_ORIGIN && origin === ALLOWED_ORIGIN) return cb(null, true);
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
app.use('/api/bookings', sizeGuard(200 * 1024), smallJson, smallUrle);

/* Admin settings endpoint: 25 MB (for base64 image uploads) */
app.use('/api/admin/settings', largeJson, largeUrle);

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
    cmsHeroSt1Val: h.stat1Val || '500+', cmsHeroSt1Lbl: h.stat1Lbl || 'Voyages organisés',
    cmsHeroSt2Val: h.stat2Val || '16',   cmsHeroSt2Lbl: h.stat2Lbl || 'Expériences',
    cmsHeroSt3Val: h.stat3Val || '98%',  cmsHeroSt3Lbl: h.stat3Lbl || 'Satisfaction',
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
    /* Testimonials */
    cmsTestimonials: tst.length ? tst : [
      {name:'Karim Bensouda',role:'DRH, OCP Group',text:'Notre équipe de 45 est venue au Maroc sans attentes particulières. Ce que nous avons vécu a été transformateur — le bivouac désert a redéfini notre façon de travailler ensemble.',rating:5,featured:true,seg:'team',img:'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&q=70'},
      {name:'Wei Zhang',role:'Tour Operator, Shanghai',text:'En tant qu\'opérateur de voyage chinois, la logistique était ma grande inquiétude. Roamers a fourni un guide mandarin et c\'est l\'un des circuits les mieux organisés que nous ayons vécus en Afrique.',rating:5,featured:true,seg:'groupe',img:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=70'},
      {name:'Sophie Martin',role:'Travel Blogger, Lyon',text:'J\'ai voyagé dans 50+ pays. Le trek Atlas avec Roamers est dans mon top 3. Nos guides étaient des historiens, des conteurs et des experts montagne réunis en une seule personne.',rating:5,featured:true,seg:'weekend',img:'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=70'}
    ],
    /* SEO */
    seoTitle:       seo.title       || 'Roamers Community — Morocco Adventure Booking',
    seoDescription: seo.description || 'Morocco\'s premier experiential travel platform. Book desert treks, mountain adventures, and cultural tours.',
    seoKeywords:    seo.keywords    || 'morocco travel,sahara trek,atlas mountains,marrakech tour,team building morocco',
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

  if (!token || !token.startsWith('ExponentPushToken[')) {
    return res.status(400).json({ error: 'Invalid Expo push token' });
  }

  /* Upsert: update existing or insert new */
  var existing = db.pushTokens.find(function(t){ return t.token === token; });
  if (existing) {
    db.pushTokens.update(
      function(t){ return t.token === token; },
      { platform: platform || existing.platform, deviceId: deviceId || existing.deviceId, updatedAt: new Date().toISOString() }
    );
  } else {
    db.pushTokens.insert({
      id:        require('uuid').v4(),
      token:     token,
      platform:  platform || 'android',
      deviceId:  deviceId || '',
      active:    true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  await db.pushTokens.flush();
  res.json({ message: 'Token enregistré' });
});

/* ── PUBLIC ACTIVITIES ───────────────────────────────────────── */
app.get('/api/activities', function(req, res) {
  var acts = db.activities.all()
    .filter(function(a){ return a.status === 'active'; })
    .sort(function(a, b){ return new Date(a.created) - new Date(b.created); });
  res.json({ activities: acts });
});

/* ── STATIC FILES ────────────────────────────────────────────── */
app.use(express.static(PUBLIC, {
  maxAge: isProd ? '1d' : 0,
  setHeaders: function(res, fp) {
    if (fp.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
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
