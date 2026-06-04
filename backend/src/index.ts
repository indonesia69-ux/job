import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

// Load environment variables (ensure this is at the top)
import dotenv from 'dotenv';
dotenv.config();

// Logger
import logger from './lib/logger';

// Import Routes
import authRoutes from './routes/authRoutes';
import jobRoutes from './routes/jobRoutes';
import hospitalRoutes from './routes/hospitalRoutes';
import applicationRoutes from './routes/applicationRoutes';
import candidateRoutes from './routes/candidateRoutes';
import savedJobRoutes from './routes/savedJobRoutes';
import searchRoutes from './routes/searchRoutes';
import statsRoutes from './routes/statsRoutes';
import adminRoutes from './routes/adminRoutes';
import onboardingRoutes from './routes/onboardingRoutes';
import uploadRoutes from './routes/uploadRoutes';

const app = express();

// Request logging via morgan + winston
app.use(morgan('dev', { stream: { write: (message) => logger.info(message.trim()) } }));

// Increase payload limit for old base64 CV compat (15MB)
app.use(express.json({ limit: '15mb' }));

// ─── CORS ────────────────────────────────────────────────────────────────────
// In production, configure ALLOWED_ORIGINS in .env
const allowedOriginsStr = process.env.ALLOWED_ORIGINS;
const allowedOrigins = allowedOriginsStr ? allowedOriginsStr.split(',').map(s => s.trim()) : null;

app.use(cors({
  origin: (origin, callback) => {
    // If no origin restriction set, allow all (development fallback)
    if (!allowedOrigins) return callback(null, true);
    // Allow non-browser requests (Postman, etc) or matching origin
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ─── API Routes ──────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/saved-jobs', savedJobRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dashboard/stats', statsRoutes);

// New Routes
app.use('/api/admin', adminRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── Server Start ────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on http://127.0.0.1:${PORT}`);
  
  // Initialize background cron jobs
  import('./lib/cronJobs').then(({ initCronJobs }) => {
    initCronJobs();
  }).catch(err => {
    logger.error('Failed to init cron jobs: ' + err);
  });

  if (!process.env.JWT_SECRET) {
    logger.warn('WARNING: JWT_SECRET is not set in environment.');
  }
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    logger.warn('WARNING: CLOUDINARY_CLOUD_NAME is not set. Uploads will fail.');
  }
  if (process.env.NODE_ENV === 'production' && !allowedOrigins) {
    logger.warn('WARNING: CORS is wide open in production! Set ALLOWED_ORIGINS.');
  }
});
