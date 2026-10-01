# FitVerse — API

Node + Express 5 + MongoDB (Mongoose) REST API for the FitVerse frontend in the parent folder. JWT auth with role-based access for **member**, **trainer** and **admin**.

## Quick start

```bash
# MongoDB must be running locally (macOS: brew services start mongodb-community)
cd server
npm install
cp .env.example .env      # set JWT secrets; dev falls back to insecure defaults
npm run seed              # wipes the DB and loads demo data
npm run dev               # http://localhost:5001/api/v1  (restarts on file changes)
```

| Script                 | What it does                                                                 |
| ---------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`          | Dev server with auto-restart, reads `.env`                                   |
| `npm start`            | Production start; reads only real environment variables                      |
| `npm run start:local`  | Like `start`, but reads `.env`                                               |
| `npm run seed`         | Wipes the DB and loads demo data (refuses when `NODE_ENV=production`)        |
| `npm run create-admin` | Creates or resets an admin from `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` |

For deployment, see [../DEPLOYMENT.md](../DEPLOYMENT.md).

Then run the frontend from the parent folder with `npm run dev`. Its Vite proxy sends `/api/*` to `http://localhost:5001`.

> **Don't use port 5000 on macOS.** AirPlay Receiver listens there and answers every request with `403 Forbidden`.

### Demo accounts (after `npm run seed`)

All passwords are `Password123`.

| Role    | Email                  | Notes                                                    |
| ------- | ---------------------- | -------------------------------------------------------- |
| Admin   | `admin@fitverse.dev`   |                                                          |
| Trainer | `maya@fitverse.dev`    | Also `diego@`, `priya@`, `sam@`                          |
| Member  | `member@fitverse.dev`  | Active Monthly plan, bookings, workouts, progress, plan  |

Other members cover each membership state: `taylor@` (active annual), `riley@` (frozen), `morgan@` (expired), `quinn@` (cancelled).

## Environment variables

| Variable               | Default                                | Purpose                                                        |
| ---------------------- | -------------------------------------- | -------------------------------------------------------------- |
| `PORT`                 | `5001`                                 | HTTP port                                                      |
| `MONGO_URI`            | `mongodb://127.0.0.1:27017/fitverse`   | MongoDB connection string                                      |
| `JWT_ACCESS_SECRET`    | insecure dev value                     | **Required in production.** Signs access tokens                |
| `JWT_REFRESH_SECRET`   | insecure dev value                     | **Required in production.** Signs refresh tokens               |
| `JWT_ACCESS_TTL`       | `15m`                                  | Access-token lifetime                                          |
| `JWT_REFRESH_TTL_DAYS` | `7`                                    | Refresh-cookie lifetime                                        |
| `CLIENT_ORIGIN`        | `http://localhost:5173`                | CORS origins (comma-separated), only for cross-origin setups   |
| `CLIENT_URL`           | `http://localhost:5173`                | Base of password-reset links                                   |
| `COOKIE_SAMESITE`      | `lax`                                  | Set to `none` (with HTTPS) when the frontend is on another site |
| `COOKIE_SECURE`        | `true` in production                   | Secure flag on the refresh cookie                              |
| `CLIENT_DIST`          | unset                                  | Path to the built frontend; when set, the server also serves the website |
| `UPLOAD_DIR`           | `./uploads`                            | Where avatars and progress photos are stored                   |
| `TRUST_PROXY`          | `1`                                    | Number of reverse proxies in front of the app                  |

In production (`NODE_ENV=production`), `MONGO_URI`, `CLIENT_URL` and both JWT secrets are required. The secrets must be 32+ characters and different from each other.

## Auth and access control

- `POST /auth/login` and `/auth/register` return `{ user, accessToken }` and set the refresh token as an httpOnly cookie (`fv_refresh`, scoped to `/api/v1/auth`).
- Send `Authorization: Bearer <accessToken>`. Expired or invalid tokens get **401**, which makes the frontend refresh once and retry. A valid token with the wrong role gets **403**.
- `POST /auth/refresh` rotates the cookie. Logout, password change and password reset invalidate older refresh tokens.
- Public sign-up always creates a **member**. Only admins can create trainers or admins (`POST /users`).
- Auth endpoints are rate-limited (30 requests per 15 minutes per IP).

| Area                                   | Who                                                     |
| -------------------------------------- | ------------------------------------------------------- |
| `GET /plans`, `/classes`, `/trainers`  | Public (admins also see inactive plans)                 |
| Bookings, memberships, check-in        | Members (admins can cancel any)                         |
| Workouts, progress                     | Owner only; trainers can read their clients' progress   |
| Create/edit classes, roster, attendance | Trainers (own classes only) and admins                 |
| Workout plans for a client             | Trainers (their clients only) and admins                |
| `/users`, `/admin/*`, plan management  | Admins                                                  |

A trainer's **clients** are members who have booked one of the trainer's classes or who have a workout plan from that trainer.

## Business rules

- Booking requires an active membership. Capacity is enforced atomically. Members are limited to `policies.maxWeeklyBookings` per week, and can't cancel within `policies.cancelWindowHours` of the class (both set in Admin → Settings).
- Subscribing cancels any current membership and records a **paid** payment immediately. **There is no payment gateway.**
- Memberships past their end date are marked `expired` the next time they're read.
- Deleting a class cancels its bookings. Plans that members have used can't be deleted, only deactivated. Trainers with upcoming classes can't be deleted.
- **There is no email provider.** Password-reset links are printed to the server console.
- Uploads (avatars and progress photos) are stored in `server/uploads/` under random file names and served from `/api/v1/uploads/...`.

## Layout

```
src/
  server.js        connect to Mongo, start HTTP server
  app.js           middleware + route mounting
  config.js        env config
  seed.js          demo data
  middleware/      auth (authenticate, optionalAuth, authorize), uploads, errors
  models/          Mongoose schemas
  routes/          one router per resource
  utils/           paging/sorting helpers, validation, tokens, trainer-client lookup
```

Errors look like `{ success: false, message, errors?: { field: message } }`. Field keys match form fields (e.g. `exercises.0.sets.1.reps`), so the frontend shows them inline.
