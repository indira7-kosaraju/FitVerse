import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';
import { config } from './config.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import { UPLOAD_ROOT } from './middleware/upload.js';
import admin from './routes/admin.js';
import attendance from './routes/attendance.js';
import auth from './routes/auth.js';
import bookings from './routes/bookings.js';
import classes from './routes/classes.js';
import memberships from './routes/memberships.js';
import payments from './routes/payments.js';
import plans from './routes/plans.js';
import progress from './routes/progress.js';
import trainers from './routes/trainers.js';
import users from './routes/users.js';
import workoutPlans from './routes/workoutPlans.js';
import workouts from './routes/workouts.js';

const app = express();

app.set('trust proxy', config.trustProxy);

/* ---------- Frontend (same-origin deployment) ---------- */

const indexFile = config.clientDist && path.join(config.clientDist, 'index.html');
const serveClient = Boolean(indexFile && fs.existsSync(indexFile));
if (config.clientDist && !serveClient) throw new Error(`CLIENT_DIST is set but ${indexFile} does not exist. Run the frontend build first.`);

/** CSP hashes for the inline scripts in index.html (the theme bootstrapper), so no 'unsafe-inline' is needed. */
const inlineScriptHashes = serveClient
  ? [...fs.readFileSync(indexFile, 'utf8').matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
      ([, body]) => `'sha256-${crypto.createHash('sha256').update(body).digest('base64')}'`
    )
  : [];

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", ...inlineScriptHashes],
        // react-hot-toast injects <style> tags; Google Fonts serves the stylesheet.
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: config.cookieSecure ? [] : null,
      },
    },
    crossOriginResourcePolicy: { policy: 'same-site' },
    hsts: config.isProd ? undefined : false,
  })
);
app.use(compression());
app.use(morgan(config.isProd ? 'combined' : 'dev', { skip: (req) => req.originalUrl === `${config.apiPrefix}/health` }));

/* ---------- API ---------- */

const api = express.Router();
// Only matters when the frontend is on another origin; same-origin requests don't need CORS.
api.use(cors({ origin: config.clientOrigins, credentials: true, exposedHeaders: ['Content-Disposition'] }));
api.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please slow down.' },
  })
);
api.use(express.json({ limit: '200kb' }));
api.use(cookieParser());
api.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

api.get('/health', (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({ success: dbUp, status: dbUp ? 'ok' : 'database unavailable' });
});
api.use('/uploads', (req, res, next) => {
  res.set('Cache-Control', 'private, max-age=604800');
  next();
}, express.static(UPLOAD_ROOT, { fallthrough: false, index: false, dotfiles: 'deny' }));
api.use('/auth', auth);
api.use('/users', users);
api.use('/plans', plans);
api.use('/memberships', memberships);
api.use('/payments', payments);
api.use('/classes', classes);
api.use('/bookings', bookings);
api.use('/attendance', attendance);
api.use('/trainers', trainers);
api.use('/workouts', workouts);
api.use('/workout-plans', workoutPlans);
api.use('/progress', progress);
api.use('/admin', admin);
api.use(notFoundHandler);

app.use(config.apiPrefix, api);

if (serveClient) {
  // Hashed build assets never change, so cache them for a year; index.html must always be revalidated.
  app.use(
    express.static(config.clientDist, {
      index: false,
      setHeaders: (res, file) => {
        res.set('Cache-Control', file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');
      },
    })
  );
  // SPA fallback: client-side routes (/app, /admin/...) get index.html.
  app.get(/^(?!\/api\/|\/assets\/)[^.]*$/, (req, res) => {
    res.set('Cache-Control', 'no-cache');
    res.sendFile(indexFile);
  });
}

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
