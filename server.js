/**
 * server.js — Roamers Community Production Server
 */
require('dotenv').config();

const express   = require('express');
const path      = require('path');
const helmet    = require('helmet');
const cors      = require('cors');
const compress  = require('compression');
const rateLimit = require('express-rate-limit');
const morgan    = require('morgan');

require('./database'); // init DB + seed

const app    = express();
const PORT   = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const isProd = process.env.NODE_ENV === 'production';

app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: isProd ? (process.env.FRONTEND_URL || true) : true, credentials: true }));
app.use(compress());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
if (!isProd) app.use(morgan('dev'));

const apiLim  = rateLimit({ windowMs: 15*60*1000, max: 300 });
const authLim = rateLimit({ windowMs: 15*60*1000, max: 20, message: { error: 'Too many attempts' } });
const frmLim  = rateLimit({ windowMs: 60*60*1000, max: 15, message: { error: 'Too many submissions' } });

app.use('/api/', apiLim);
app.use('/api/auth',        authLim, require('./routes/auth'));
app.use('/api/bookings',             require('./routes/bookings'));
app.use('/api/forms',       frmLim,  require('./routes/forms'));
app.use('/api/experiences',          require('./routes/experiences'));
app.use('/api/admin',                require('./routes/admin'));

app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', app: 'Roamers Community', env: process.env.NODE_ENV || 'development', time: new Date().toISOString() })
);

app.use(express.static(PUBLIC, {
  maxAge: isProd ? '1d' : 0,
  setHeaders(res, fp) { if (fp.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); }
}));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(PUBLIC, 'index.html'));
});

app.use((err, _req, res, _next) => {
  console.error('[Error]', err.message);
  res.status(500).json({ error: isProd ? 'Internal server error' : err.message });
});

const server = app.listen(PORT, () => {
  console.log('\n  ╔══════════════════════════════════════════════════╗');
  console.log('  ║  ROAMERS COMMUNITY  —  Server ready              ║');
  console.log('  ╠══════════════════════════════════════════════════╣');
  console.log(`  ║  Local:   http://localhost:${PORT}                    ║`);
  console.log(`  ║  Health:  http://localhost:${PORT}/api/health         ║`);
  console.log('  ║  Admin:   admin@roamerscommunity.ma / admin123   ║');
  console.log('  ║  Press Ctrl+C to stop                            ║');
  console.log('  ╚══════════════════════════════════════════════════╝\n');
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') console.error(`\n  Port ${PORT} is busy. Try PORT=${+PORT+1} node server.js\n`);
  else console.error(err);
  process.exit(1);
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
