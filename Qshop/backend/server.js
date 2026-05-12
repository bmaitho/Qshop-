// backend/server.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mpesaRoutes from './routes/mpesa.js';
import emailRoutes from './routes/email.js';
import sitemapRoutes from './routes/sitemap.js';
import buyerOrdersRoutes from './routes/buyerOrders.js';
import pickupMtaaniRoutes from './routes/pickupMtaani.js';

dotenv.config();

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Trust the Render proxy so rate-limit and req.ip work correctly
app.set('trust proxy', 1);

// ──────────────────────────────────────────────────────────────
// Security headers via Helmet
// ──────────────────────────────────────────────────────────────
app.use(
  helmet({
    // We're an API — frontend (Vercel) sets its own CSP for the SPA.
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true,
    },
  })
);

// Hide Express signature
app.disable('x-powered-by');

// ──────────────────────────────────────────────────────────────
// CORS — strict allowlist
// ──────────────────────────────────────────────────────────────
const allowedOriginsString =
  process.env.ALLOWED_ORIGINS ||
  'https://unihive.shop,https://www.unihive.shop,http://localhost:5173';
const allowedOrigins = allowedOriginsString
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // No-origin requests (curl, M-Pesa callbacks, PickUp Mtaani callbacks)
    // are allowed. Callback routes do their own auth via signature checks.
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }

    console.error(`CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  maxAge: 86400,
};

app.use(cors(corsOptions));

// ──────────────────────────────────────────────────────────────
// Body parsing with size limit (prevents DoS via huge payloads)
// ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ──────────────────────────────────────────────────────────────
// Rate limiting
// ──────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const sensitiveLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests on sensitive endpoint, please slow down.' },
  // Skip rate limit for M-Pesa & PickUp Mtaani callbacks
  skip: (req) =>
    req.path.endsWith('/callback') ||
    req.path.endsWith('/b2c-result') ||
    req.path.endsWith('/b2c-timeout') ||
    req.path.endsWith('/timeout'),
});

// Sitemap is open (Google needs it)
app.use('/', sitemapRoutes);

// ──────────────────────────────────────────────────────────────
// Welcome route — no env or origin info leaked
// ──────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>UniHive API</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; }
          .container { background-color: #f5f5f5; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
          h1 { color: #0D2B20; border-bottom: 2px solid #e7c65f; padding-bottom: 10px; }
          .status { color: #27ae60; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🛍️ UniHive API</h1>
          <p>Status: <span class="status">ONLINE</span></p>
          <p>For API documentation, contact the UniHive team.</p>
        </div>
      </body>
    </html>
  `);
});

// ──────────────────────────────────────────────────────────────
// API routes with rate limiting
// ──────────────────────────────────────────────────────────────
app.use('/api/mpesa', sensitiveLimiter, mpesaRoutes);
app.use('/api/email', sensitiveLimiter, emailRoutes);
app.use('/api/buyer-orders', generalLimiter, buyerOrdersRoutes);
app.use('/api/pickup-mtaani', generalLimiter, pickupMtaaniRoutes);

// Preflight
app.options('/api/mpesa/*', cors(corsOptions));
app.options('/api/email/*', cors(corsOptions));
app.options('/api/buyer-orders/*', cors(corsOptions));
app.options('/api/pickup-mtaani/*', cors(corsOptions));

// Health check (open, no env leakage)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.2.0',
    timestamp: new Date().toISOString(),
  });
});

// ──────────────────────────────────────────────────────────────
// Global error handler — never leaks stack traces in production
// ──────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  res.status(err.status || 500).json({
    error: isProduction ? 'Internal Server Error' : err.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`📧 Email: ${process.env.RESEND_API_KEY ? '✅' : '❌'}`);
  console.log(`📦 PickUp Mtaani: ${process.env.PICKUP_MTAANI_API_KEY ? '✅' : '❌'}`);
});