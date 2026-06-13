# ApronHanger Job Platform

ApronHanger is a healthcare hiring platform with one shared backend and three frontend portals:

- `candidates`: candidate job search, profile/CV, saved jobs, applications.
- `recruiter`: hospital onboarding, recruiter signup, jobs, applicants, candidate search, plans.
- `admin`: admin login, hospital verification, users, jobs, applications, subscriptions, logs.
- `backend`: Express API, Prisma/PostgreSQL, JWT auth, Cloudinary uploads, Razorpay payments, Brevo email, OTP flows.

## Local Development

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontends:

```bash
cd candidates   # or recruiter/admin
npm install
npm run dev
```

For local frontend development, Vite proxies `/api` to `http://127.0.0.1:3000`.

## Required Backend Environment

Copy `backend/.env.example` to `backend/.env` and set:

- `DATABASE_URL`
- `JWT_SECRET`
- `ALLOWED_ORIGINS_CANDIDATE`
- `ALLOWED_ORIGINS_RECRUITER`
- `ALLOWED_ORIGINS_ADMIN`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `FAST2SMS_API_KEY`

Razorpay test credentials are supported, but they must come from env.

## Required Frontend Environment

Each frontend must set `VITE_API_BASE` before production build:

```bash
VITE_API_BASE=https://your-render-backend.onrender.com
```

Admin also supports:

```bash
VITE_CANDIDATE_URL=https://candidate.example.com
VITE_RECRUITER_URL=https://recruiter.example.com
```

## Production Builds

```bash
cd backend && npm run build
cd candidates && npm run build
cd recruiter && npm run build
cd admin && npm run build
```

For cPanel, upload each frontend's `dist/client` contents. The included `.htaccess` files enable direct route refresh fallback to `index.html`.

## Deployment

See `DEPLOYMENT.md` for Render, NeonDB, and cPanel steps.

## QA

See `QA_CHECKLIST.md` before handing the project to a client.
