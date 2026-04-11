# Keke Park System PRD

## Overview
Keke Park System is a web application for managing driver registration, daily park fee payment, and live queue operations for a keke park. It has separate driver and admin experiences backed by an Express API and MySQL database.

## User Roles
- Driver
- Admin

## Driver Goals
- Register with personal and vehicle details.
- Upload a passport photo during registration.
- Log in with phone number and password.
- View profile and approval status.
- Pay the daily park fee.
- Join the loading queue and monitor live queue position.

## Admin Goals
- Log in to the admin dashboard.
- Review pending driver registrations.
- Approve or reject drivers.
- View all registered drivers.
- Monitor the live queue.
- Move the first waiting driver into loading state.
- Complete loading for the active driver.

## Core Pages
- `/login`
- `/register`
- `/driver`
- `/admin`

## Key APIs
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `GET /api/driver/profile`
- `GET /api/driver/queue-position`
- `POST /api/driver/payment`
- `POST /api/driver/join-queue`
- `GET /api/admin/pending-drivers`
- `GET /api/admin/queue`
- `GET /api/admin/drivers`
- `POST /api/admin/approve/:id`
- `POST /api/admin/reject/:id`
- `POST /api/admin/load-first`
- `POST /api/admin/complete-loading`

## Constraints
- Admin testing requires valid admin credentials in the database.
- Queue and payment flows depend on authenticated backend state.
- Registration requires a valid image upload for passport photo.
