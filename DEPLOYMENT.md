# Deployment Guide

## Backend: Render + NeonDB

1. Create a Neon PostgreSQL database.
2. Set `DATABASE_URL` with `sslmode=require`.
3. Create a Render Web Service from the `backend` folder.
4. Use build command:

```bash
npm ci && npx prisma generate && npm run build
```

5. Use start command:

```bash
npm start
```

(`npm start` already runs `npx prisma migrate deploy` before starting the server — do not prefix another migrate deploy.)

6. Set all env vars from `backend/.env.example`.
7. Set exact frontend origins using:

```env
ALLOWED_ORIGINS_CANDIDATE=https://candidate.example.com
ALLOWED_ORIGINS_RECRUITER=https://recruiter.example.com
ALLOWED_ORIGINS_ADMIN=https://admin.example.com
```

8. Run admin seed only after changing `ADMIN_PASSWORD`:

```bash
npm run seed:admin
```

## Payments: Razorpay Test Mode

- Use Razorpay test key ID and test secret in Render env.
- The recruiter portal creates a real Razorpay test order.
- Checkout response is verified by `/api/payment/verify`.
- Do not use hardcoded payment refs.

## Frontends: cPanel Static Hosting

For each app:

1. Create `.env` from `.env.example`.
2. Set `VITE_API_BASE` to the Render backend URL.
3. Build:

```bash
npm ci
npm run build
```

4. Upload the **entire contents** of the `dist/` folder to the correct cPanel public folder.
5. Ensure `.htaccess` is uploaded with the build output.
6. Verify direct refresh on nested routes:
   - candidate `/jobs/some-id`
   - candidate `/applications`
   - recruiter `/applicants`
   - recruiter `/settings`
   - admin `/verifications`

## Post-Deploy Checks

- Backend `/health` returns `{ "status": "ok" }`.
- Candidate, recruiter, and admin apps call the Render backend, not relative `/api`.
- CORS rejects unknown origins and allows only deployed frontend domains.
- Cloudinary uploads work.
- Razorpay test checkout completes and updates the hospital plan.
