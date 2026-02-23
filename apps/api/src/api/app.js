import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import logger from './lib/logger.js';
import errorHandler from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import capturesRouter from './routes/captures.js';
import batchesRouter from './routes/batches.js';
import orgsRouter from './routes/orgs.js';
import exportsRouter from './routes/exports.js';
import tasksRouter from './routes/tasks.js';
import cobrowseRouter from './routes/cobrowse.js';

const app = express();

// ---------------------------------------------------------------------------
// Middleware stack
// ---------------------------------------------------------------------------

// 1. CORS — allow cross-origin requests from Next.js frontend
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',');
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

// 2. Helmet — security headers (CSP managed by frontend, API is headless)
app.use(helmet());

// 3. Rate limiter (300 req / 15 min on /api)
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// 4. JSON body parser (1 MB limit)
app.use(express.json({ limit: '1mb' }));

// 5. Request logger (Pino structured JSON)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ms: Date.now() - start,
    });
  });
  next();
});

// ---------------------------------------------------------------------------
// API Routes
// ---------------------------------------------------------------------------

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/captures', capturesRouter);
app.use('/api/batches', batchesRouter);
app.use('/api/orgs', orgsRouter);
app.use('/api/exports', exportsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/cobrowse', cobrowseRouter);

// ---------------------------------------------------------------------------
// Global error handler (catch-all last)
// ---------------------------------------------------------------------------
app.use(errorHandler);

export default app;
