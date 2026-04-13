# Keke Park Backend

The backend is an Express + Socket.IO API for authentication, driver onboarding, approvals, payments, and queue management.

## Runtime Stack

- Node.js
- Express
- PostgreSQL via `pg`
- Supabase Storage for passport uploads
- JWT auth with HTTP-only cookies
- Socket.IO for queue updates

## Environment Variables

Copy [`.env.example`](C:\Users\Zeelot\Desktop\keke-park-system\backend\.env.example) to `.env` and fill in:

- `NODE_ENV`
- `PORT`
- `CLIENT_ORIGIN`
- `PUBLIC_BACKEND_URL`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET`
- `EMAILJS_SERVICE_ID`
- `EMAILJS_TEMPLATE_ID`
- `EMAILJS_PUBLIC_KEY`
- `EMAILJS_PRIVATE_KEY`
- `EMAIL_FROM_NAME`
- `DEMO_ADMIN_PASSWORD`
- `DEMO_DRIVER_PASSWORD`

## Local Setup

From `backend`:

```powershell
npm install
copy .env.example .env
npm run db:setup
npm run seed:demo
npm run dev
```

## Database Commands

- Create or update the PostgreSQL schema:
  `npm run db:setup`
- Seed the demo admin and demo driver:
  `npm run seed:demo`
- Do both in one step:
  `npm run db:setup:seed`
- Normalize legacy phone records imported from older MySQL data:
  `npm run migrate:phones`
- Validate the `cooldown_log` foreign key still cascades on delete:
  `npm run migrate:cooldown-cascade`

## Demo Credentials

- Admin phone: `08000000001` or `+2348000000001`
- Admin password: `admin123`
- Driver phone: `08011111111` or `+2348011111111`
- Driver password: `Driver123!`

Override the demo passwords with `DEMO_ADMIN_PASSWORD` and `DEMO_DRIVER_PASSWORD` before running the seed script if needed.

## Upload Behavior

- Registration still expects the multipart field `passport_photo`.
- If Supabase is configured, passport images are uploaded to the configured storage bucket and a public URL is saved in the database.
- If Supabase is not configured, uploads fall back to local `backend/uploads` for development.
- Maximum upload size is `2MB`.

## Email Verification

- Driver registration can send a verification email when a valid email address is supplied and EmailJS is configured.
- Clicking the verification link marks the email as verified and automatically approves the pending driver account.
- If the user never verifies the email, the normal admin approval flow remains available as the fallback.
- Set `PUBLIC_BACKEND_URL` to your live backend URL so the email link points to the correct Render deployment.
- If the EmailJS variables are not configured, registration still works and the account simply waits for manual admin approval.
- Use [EMAILJS_TEMPLATE.md](C:\Users\Zeelot\Desktop\keke-park-system\backend\EMAILJS_TEMPLATE.md) for a ready-to-paste subject and email body.

## Production Notes

- Set `NODE_ENV=production` on Render.
- Set `CLIENT_ORIGIN` to your exact Vercel frontend URL.
- Set `PUBLIC_BACKEND_URL` to your exact Render backend URL.
- Cookie settings automatically switch to `secure: true` and `sameSite: none` in production.
- The backend exposes `GET /api/health` for quick health checks.
- Render free web services can take a few seconds to wake up after inactivity.

## Tests

Run the Jest suite:

```powershell
npm run test
```

Current coverage includes:

- login phone normalization
- login validation failure
- registration verification email handoff
- email verification auto-approval redirect flow
- daily payment upsert flow
- queue cooldown enforcement
- queue join success
- admin approval guardrails
- admin park ID assignment
