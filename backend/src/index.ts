import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

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

// Modular Admin Routes
import adminAuthRoutes from './routes/admin/adminAuthRoutes';
import adminHospitalRoutes from './routes/admin/adminHospitalRoutes';
import adminUserRoutes from './routes/admin/adminUserRoutes';
import adminCandidateRoutes from './routes/admin/adminCandidateRoutes';
import adminStatsRoutes from './routes/admin/adminStatsRoutes';
import adminJobRoutes from './routes/admin/adminJobRoutes';
import adminSystemRoutes from './routes/admin/adminSystemRoutes';
import adminSearchRoutes from './routes/adminSearchRoutes';
import onboardingRoutes from './routes/onboardingRoutes';
import onboardingVerifyRoutes from './routes/onboardingVerifyRoutes';
import uploadRoutes from './routes/uploadRoutes';
import planRoutes from './routes/planRoutes';
import paymentRoutes from './routes/paymentRoutes';

function requireEnv(name: string): void {
  if (!process.env[name]) {
    throw new Error(`FATAL: ${name} environment variable is not set.`);
  }
}

[
  'DATABASE_URL',
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
].forEach(requireEnv);

const app = express();

app.use(helmet());

// Request logging via morgan + winston
app.use(morgan('dev', { stream: { write: (message) => logger.info(message.trim()) } }));

// Reduce payload limit since base64 CV compat is deprecated
app.use(express.json({ limit: '5mb' }));

// ─── Rate Limiting ───────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per `window` (here, per 15 minutes)
  message: { error: 'Too many login attempts, please try again after 15 minutes' },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // 150 searches per 15 minutes
  message: { error: 'Too many search requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 uploads per 15 minutes
  message: { error: 'Upload limit reached, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 OTPs per 15 minutes
  message: { error: 'Too many OTP requests, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── CORS ────────────────────────────────────────────────────────────────────
// In production, configure ALLOWED_ORIGINS in .env
const originsCandidate = process.env.ALLOWED_ORIGINS_CANDIDATE ? process.env.ALLOWED_ORIGINS_CANDIDATE.split(',').map(s => s.trim()) : [];
const originsRecruiter = process.env.ALLOWED_ORIGINS_RECRUITER ? process.env.ALLOWED_ORIGINS_RECRUITER.split(',').map(s => s.trim()) : [];
const originsAdmin = process.env.ALLOWED_ORIGINS_ADMIN ? process.env.ALLOWED_ORIGINS_ADMIN.split(',').map(s => s.trim()) : [];
const legacyOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()) : [];

const allowedOrigins = [...new Set([...originsCandidate, ...originsRecruiter, ...originsAdmin, ...legacyOrigins])];

app.use(cors({
  origin: (origin, callback) => {
    if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
      return callback(new Error('CORS is not configured for production'));
    }
    // If no origin restriction set, allow all in development fallback
    if (allowedOrigins.length === 0) return callback(null, true);
    // Allow non-browser requests (Postman, etc) or matching origin
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ─── API Routes ──────────────────────────────────────────────────────────────

// Limiters must be registered BEFORE the routes they protect
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', otpLimiter);
app.use('/api/auth/verify-otp', otpLimiter);
app.use('/api/auth/reset-password', otpLimiter);
app.use('/api/auth/resend-otp', otpLimiter);
app.use('/api/onboarding/verify-mobile', otpLimiter);
app.use('/api/onboarding/resend-otp', otpLimiter);

app.use('/api/auth', authRoutes);

// Modular Admin Routes (replaces monolith adminRoutes)
app.use('/api/admin/auth/login', authLimiter);
app.use('/api/admin', adminAuthRoutes);
app.use('/api/admin', adminHospitalRoutes);
app.use('/api/admin', adminUserRoutes);
app.use('/api/admin', adminCandidateRoutes);
app.use('/api/admin', adminStatsRoutes);
app.use('/api/admin', adminJobRoutes);
app.use('/api/admin', adminSystemRoutes);
app.use('/api/admin', adminSearchRoutes);

app.use('/api/hospitals', hospitalRoutes);
app.use('/api/candidates', searchLimiter, candidateRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/search', searchLimiter, searchRoutes);
app.use('/api/upload', uploadLimiter, uploadRoutes);
app.use('/api/plan', planRoutes);
app.use('/api/payment', paymentRoutes);

app.use('/api/onboarding', onboardingRoutes);
app.use('/api/onboarding', onboardingVerifyRoutes);
app.use('/api/saved-jobs', savedJobRoutes);
app.use('/api/dashboard/stats', statsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// ─── Global Error Handler ────────────────────────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
  res.status(500).json({ error: 'Internal Server Error' });
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

  if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    logger.warn('WARNING: No production CORS origins are configured; browser API requests will be rejected.');
  }
});
