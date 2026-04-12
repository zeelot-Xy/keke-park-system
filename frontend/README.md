# Keke Park Frontend

This is the React + Vite client for the Keke Park System. It gives drivers and admins a responsive interface for registration, login, approvals, payments, queue management, and live queue updates.

## Stack

- React 19
- Vite 8
- React Router
- Axios
- Socket.IO client
- Tailwind CSS 4
- Lucide React icons
- ESLint

## Features

- responsive login, registration, driver, and admin screens
- cookie-based auth with session restore on app load
- real-time queue updates over Socket.IO
- driver registration with passport photo upload
- admin approval and queue dispatch controls
- environment-based API configuration through `VITE_API_URL`
- compatibility with Supabase-hosted passport image URLs and local development upload URLs

## Environment

Copy [`.env.example`](C:\Users\Zeelot\Desktop\keke-park-system\frontend\.env.example) to `.env` and set:

```env
VITE_API_URL=http://localhost:5000
```

In production, point `VITE_API_URL` to your deployed Render backend URL.

## Local Development

From `frontend`:

```powershell
npm install
copy .env.example .env
npm run dev
```

The default Vite local URL is usually `http://localhost:5173`.

## Production Build

```powershell
npm run build
npm run preview
```

## Linting

```powershell
npm run lint
```

## Deployment On Vercel

This frontend is prepared for Vercel:

1. Import the repository into Vercel.
2. Set the root directory to `frontend`.
3. Set `VITE_API_URL` to your Render backend URL.
4. Deploy.

[vercel.json](C:\Users\Zeelot\Desktop\keke-park-system\frontend\vercel.json) adds an SPA rewrite so React Router routes resolve correctly on refresh and direct visits.

## Routes

- `/login`
- `/register`
- `/driver`
- `/admin`

## Backend Expectations

The frontend expects the backend to:

- allow credentialed requests from the frontend origin
- expose Socket.IO on the same base URL as the REST API
- return absolute passport photo URLs for Supabase-hosted images, or relative `/uploads/...` paths for local development fallback

## Notes

- Login accepts both local `080...` and normalized `+234...` Nigerian phone input.
- The app uses shared API and socket configuration from `src/lib/`.
- Passport photos now render correctly whether they come from Supabase Storage or local backend uploads.

## Related Docs

- [Project Root README](C:\Users\Zeelot\Desktop\keke-park-system\README.md)
- [Backend README](C:\Users\Zeelot\Desktop\keke-park-system\backend\README.md)
