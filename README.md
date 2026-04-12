# Keke Park System

Keke Park System is a portfolio-ready transport queue management app with:

- a `frontend` React + Vite client for drivers and admins
- a `backend` Express + Socket.IO API
- PostgreSQL on Supabase
- passport photo storage on Supabase Storage

## Stack

- Frontend: React, Vite, Axios, Socket.IO client, Tailwind CSS
- Backend: Express, Socket.IO, JWT cookies, Multer, PostgreSQL
- Hosting: Vercel for frontend, Render Free Web Service for backend
- Database and file storage: Supabase Free

## Demo Credentials

- Admin phone: `08000000001` or `+2348000000001`
- Admin password: `admin123`
- Driver phone: `08011111111` or `+2348011111111`
- Driver password: `Driver123!`

These are seeded by the backend demo seed script and are intended for portfolio reviewers.

## Project Structure

- [backend/README.md](C:\Users\Zeelot\Desktop\keke-park-system\backend\README.md)
- [frontend/README.md](C:\Users\Zeelot\Desktop\keke-park-system\frontend\README.md)

## Local Development

### 1. Backend

From `backend`:

```powershell
npm install
copy .env.example .env
npm run db:setup
npm run seed:demo
npm run dev
```

Required backend environment values:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CLIENT_ORIGIN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_BUCKET`

### 2. Frontend

From `frontend`:

```powershell
npm install
copy .env.example .env
npm run dev
```

Set:

- `VITE_API_URL=http://localhost:5000`

## Free Deployment

### Frontend on Vercel

1. Import the GitHub repository into Vercel.
2. Set the project root directory to `frontend`.
3. Add `VITE_API_URL` with your Render backend URL.
4. Deploy.

`frontend/vercel.json` is included so client-side routes like `/login`, `/register`, `/driver`, and `/admin` resolve correctly.

### Backend on Render

1. Create a new Web Service in Render from this repository.
2. Set the root directory to `backend`.
3. Render can use the included [render.yaml](C:\Users\Zeelot\Desktop\keke-park-system\render.yaml), or you can configure the same values in the dashboard.
4. Add environment variables:
   - `NODE_ENV=production`
   - `CLIENT_ORIGIN=<your-vercel-url>`
   - `DATABASE_URL=<your-supabase-postgres-url>`
   - `JWT_SECRET=<random-secret>`
   - `JWT_REFRESH_SECRET=<random-secret>`
   - `SUPABASE_URL=<your-supabase-url>`
   - `SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>`
   - `SUPABASE_BUCKET=passport-photos`
5. After the first deploy, open a Render shell and run:

```bash
npm run db:setup
npm run seed:demo
```

### Supabase

Create a free Supabase project and:

1. Copy the Postgres connection string into `DATABASE_URL`.
2. Create a public storage bucket named `passport-photos`.
3. Copy:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Portfolio Flow To Demonstrate

- admin login
- driver login
- driver registration with passport photo
- admin approval
- daily payment
- queue join
- live queue updates

## Checks

### Backend

From `backend`:

```powershell
npm run test
```

### Frontend

From `frontend`:

```powershell
npm run lint
npm run build
```

## Notes

- Nigerian phone numbers are stored in normalized `+234...` format.
- Login accepts both `080...` and `+234...`.
- Passport photos use Supabase Storage when configured, with local `backend/uploads` fallback for development.
- Render free instances can cold start after idle time.
