# QA Checklist

## Build and Lint

- [ ] Backend `npm run build` passes.
- [ ] Candidate `npm run lint` passes.
- [ ] Candidate `npm run build` passes.
- [ ] Recruiter `npm run lint` passes.
- [ ] Recruiter `npm run build` passes.
- [ ] Admin `npm run lint` passes.
- [ ] Admin `npm run build` passes.

## Candidate Flow

- [ ] Candidate signup/login works.
- [ ] Candidate profile saves.
- [ ] CV upload works.
- [ ] Job list loads from backend.
- [ ] Job detail loads on direct refresh.
- [ ] Candidate can apply to a job.
- [ ] Candidate can view applications.
- [ ] Saved jobs work.

## Recruiter Flow

- [ ] Hospital onboarding submits.
- [ ] Admin-approved invite code validates.
- [ ] Recruiter signup/login works.
- [ ] Recruiter can create a job.
- [ ] Recruiter can close/publish jobs.
- [ ] Applicants page loads from backend.
- [ ] Application status workflow works.
- [ ] Candidate search respects plan limits.
- [ ] Razorpay test payment upgrades plan.

## Admin Flow

- [ ] Admin login works.
- [ ] Admin search uses the logged-in session.
- [ ] Hospital verification approve/reject/request-docs works.
- [ ] Recruiter/candidate suspend/reactivate works.
- [ ] Jobs/applications admin actions work.
- [ ] Subscriptions page loads with admin session auth.
- [ ] Impersonation is audited.

## Deployment

- [ ] Render backend starts with NeonDB.
- [ ] Prisma migrations apply successfully.
- [ ] CORS allows only configured frontend domains.
- [ ] All cPanel apps use `VITE_API_BASE`.
- [ ] Direct refresh works on nested frontend routes.
