# FitVerse

**A full-stack gym and fitness management web app.** Members book classes and track their training, trainers manage their classes and clients, and admins run the whole gym from one dashboard.

**🔗 Live demo:** https://fitverse-9nxd.onrender.com/

![FitVerse landing page](docs/screenshots/landing.jpg)

---

## Contents

- [Features](#features)
- [Screenshots](#screenshots)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [Demo accounts](#demo-accounts)
- [Project structure](#project-structure)
- [How it works](#how-it-works)
- [API reference](#api-reference)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [Security](#security)
- [Known limitations](#known-limitations)

---

## Features

FitVerse has three types of users. Each one gets their own area of the app.

### 🏋️ Members
- **Dashboard:** membership status, days left, one-tap gym check-in, today's classes, a weekly workout tracker with streak, and a 30-day weight chart.
- **Classes:** browse the weekly schedule, filter by type, trainer or time of day, then book or cancel a spot.
- **My bookings:** upcoming and past classes, including attended and missed ones.
- **Workouts:** log workouts with exercises, sets, reps and weights. Shows total volume.
- **Workout plan:** follow a multi-week plan from your trainer and tick off each day.
- **Progress:** record weight, body fat and body measurements, upload progress photos, and see charts over time.
- **Trainers:** browse coaches by specialty and see their upcoming classes.
- **Membership:** choose or switch plans, see payment history, cancel.
- **Profile:** edit details, upload a photo, add an emergency contact, change password.

### 🧑‍🏫 Trainers
- **Dashboard:** today's classes, this week's schedule, booked spots and client count.
- **My classes:** create, edit and cancel classes, open the attendance list and mark people present or absent.
- **Clients:** see each client's membership, progress charts and emergency contact.
- **Plan builder:** create multi-week workout plans for clients (weeks → days → exercises).

### 🛠️ Admins
- **Dashboard:** active members, revenue this month, today's check-ins, churn rate, new members, a revenue chart, membership mix and peak gym hours.
- **Members:** search, filter, sort, edit, freeze or reactivate memberships (one at a time or in bulk), delete.
- **Trainers:** add trainer accounts, edit specialties and bios.
- **Classes:** manage the whole schedule, including weekly repeating classes.
- **Plans:** create membership plans, set prices and features, turn plans on or off.
- **Payments:** search and filter all payments by date and status.
- **Reports:** revenue and membership charts, plus CSV exports (payments, members, attendance, classes).
- **Settings:** gym details, opening hours and booking rules (cancellation window, weekly booking limit).

### ✨ Everywhere
- **Public landing page** with live plans, trainers and this week's schedule.
- **Accounts:** register, log in, forgot and reset password. You stay logged in across page reloads.
- **Layout:** responsive, with a sidebar on desktop and a bottom navigation bar on mobile.
- **Themes:** dark and light, remembered between visits.
- **Accessible:** keyboard navigation, focus management, screen-reader labels, and reduced motion respected.

---

## Screenshots

| Member dashboard | Class booking |
| --- | --- |
| ![Member dashboard](docs/screenshots/member-dashboard.jpg) | ![Classes](docs/screenshots/member-classes.jpg) |
| **Progress tracking** | **Trainer dashboard** |
| ![Progress](docs/screenshots/member-progress.jpg) | ![Trainer dashboard](docs/screenshots/trainer-dashboard.jpg) |
| **Admin dashboard** | **Admin reports** |
| ![Admin dashboard](docs/screenshots/admin-dashboard.jpg) | ![Reports](docs/screenshots/admin-reports.jpg) |

<p align="center"><img src="docs/screenshots/mobile-dashboard.jpg" alt="Mobile view" width="300"><br><em>Mobile view</em></p>

---

## Tech stack

| Part | Technology |
| --- | --- |
| **Frontend** | React 18, Vite 5, React Router 6, Axios, Recharts (charts), React Hot Toast (notifications) |
| **Styling** | CSS Modules with CSS variables for dark and light themes. No UI library. |
| **State** | React Context + `useReducer` for login and theme. A small `useFetch` hook for page data. |
| **Backend** | Node.js (20.6+), Express 5 |
| **Database** | MongoDB with Mongoose 8 |
| **Auth** | JWT access tokens + refresh token in an httpOnly cookie, bcrypt password hashing |
| **Security** | Helmet (CSP, HSTS), express-rate-limit, CORS |
| **Uploads** | Multer (avatars and progress photos) |
| **Deployment** | Docker, or any Node host (Render, Railway, Fly.io), with MongoDB Atlas |

---

## Getting started

These steps run FitVerse on your computer.

### Prerequisites
- **Node.js 20.6 or newer.** Check with `node -v`.
- **MongoDB** running locally. On a Mac: `brew tap mongodb/brew && brew install mongodb-community && brew services start mongodb-community`. Or use a free [MongoDB Atlas](https://www.mongodb.com/atlas) database.

### 1. Clone and install

```bash
git clone https://github.com/indira7-kosaraju/FitVerse.git
cd FitVerse

npm install              # frontend
cd server && npm install # backend
```

### 2. Configure

```bash
# in the server/ folder
cp .env.example .env
```

The defaults work for local development. Set `MONGO_URI` in `server/.env` if your database isn't at `mongodb://127.0.0.1:27017/fitverse`.

### 3. Add demo data (optional)

```bash
# in the server/ folder
npm run seed
```

This **wipes the database** and fills it with demo plans, trainers, members, classes, workouts and progress. See [Demo accounts](#demo-accounts) for the logins.

### 4. Run it

Use two terminals:

```bash
# Terminal 1: backend → http://localhost:5001
cd server
npm run dev
```

```bash
# Terminal 2: frontend → http://localhost:5173
npm run dev
```

Open **http://localhost:5173**. The frontend forwards all `/api` requests to the backend, so no extra setup is needed.

> **Mac users:** don't run the backend on port 5000. macOS AirPlay Receiver uses that port and answers every request with `403 Forbidden`.

### Available scripts

| Where | Command | What it does |
| --- | --- | --- |
| root | `npm run dev` | Start the frontend dev server |
| root | `npm run build` | Build the frontend into `dist/` |
| root | `npm run preview` | Preview the production build |
| `server/` | `npm run dev` | Start the API with auto-restart (reads `.env`) |
| `server/` | `npm start` | Start the API in production (reads real environment variables only) |
| `server/` | `npm run start:local` | Like `start`, but reads `.env` |
| `server/` | `npm run seed` | Reset the database with demo data (blocked in production) |
| `server/` | `npm run create-admin` | Create or reset an admin account |

---

## Demo accounts

These are created by `npm run seed` on **your local database only**. All passwords are **`Password123`**.

| Role | Email | What's set up |
| --- | --- | --- |
| Admin | `admin@fitverse.dev` | Full access |
| Trainer | `maya@fitverse.dev` | Has classes, clients and a workout plan for Jordan |
| Trainer | `diego@fitverse.dev`, `priya@fitverse.dev`, `sam@fitverse.dev` | Have classes |
| Member | `member@fitverse.dev` | Active plan, bookings, workouts, progress history and a workout plan |
| Member | `taylor@` / `riley@` / `morgan@` / `quinn@fitverse.dev` | Annual / frozen / expired / cancelled memberships |

> The live site does **not** have these accounts. Production starts empty, and the first admin is created with `create-admin` (see [Deployment](#deployment)).

---

## Project structure

```
FitVerse/
├── src/                      # React frontend
│   ├── api/                  # Axios setup + one file per resource (classes, plans, ...)
│   ├── components/
│   │   ├── common/           # Buttons, inputs, modals, tables, charts, cards...
│   │   ├── forms/            # Login, register, workout, class, plan, trainer forms
│   │   ├── landing/          # Landing page sections
│   │   ├── layout/           # Sidebar, navbar, mobile nav, page layouts
│   │   └── trainer/          # Plan builder, attendance list
│   ├── context/              # AuthContext (login state), ThemeContext
│   ├── hooks/                # useAuth, useFetch, useDebounce, useChartColors
│   ├── pages/
│   │   ├── public/           # Landing, login, register, password reset, 403, 404
│   │   ├── member/           # Dashboard, classes, bookings, workouts, progress...
│   │   ├── trainer/          # Dashboard, classes, clients
│   │   └── admin/            # Dashboard, members, trainers, plans, payments, reports...
│   ├── routes/               # Route list + login and role guards
│   ├── styles/               # Theme variables, global CSS, CSS Modules
│   └── utils/                # Date and currency formatting, validation, constants
│
├── server/                   # Express backend
│   └── src/
│       ├── server.js         # Starts the server and connects to MongoDB
│       ├── app.js            # Middleware, routes, serves the built frontend
│       ├── config.js         # Environment settings
│       ├── seed.js           # Demo data
│       ├── createAdmin.js    # Creates the first admin
│       ├── middleware/       # Auth + role checks, uploads, error handling
│       ├── models/           # MongoDB schemas (User, Plan, GymClass, Booking...)
│       ├── routes/           # One file per API area
│       └── utils/            # Paging, validation, tokens, helpers
│
├── docs/screenshots/         # Images used in this README
├── Dockerfile                # Builds frontend + backend into one image
├── docker-compose.yml        # App + MongoDB for self-hosting
└── .env.production.example   # Production settings template
```

---

## How it works

### One app, one address
In production the Express server serves **both** the React website and the API (`/api/v1/...`) from the same address. The website talks to the API on its own origin, so there's no CORS setup and login cookies just work. In development, Vite runs the website and forwards `/api` calls to the backend.

### Login and sessions
1. Logging in returns a short-lived **access token** (15 minutes). The browser keeps it **in memory only**, never in localStorage.
2. The server also sets a **refresh token** as an **httpOnly cookie**, which JavaScript can't read.
3. Every API request sends `Authorization: Bearer <access token>`.
4. When the access token expires, the API answers `401`. The frontend then gets a new token from `/auth/refresh` once and retries the request automatically.
5. On page reload, the app uses the refresh cookie to restore your session.
6. Logging out, changing or resetting your password signs out your other sessions.

### Roles
Every user is a **member**, **trainer** or **admin**.
- **Frontend:** members use `/app`, trainers `/trainer`, admins `/admin`. Opening another role's area sends you to a 403 page.
- **Backend:** the API checks the role on every request, so the rules can't be bypassed by calling the API directly. Requests with the wrong role get `403`.
- **Sign-up:** public registration always creates a member. Only admins can create trainer or admin accounts.

A trainer's **clients** are members who have booked one of the trainer's classes, or who have a workout plan from that trainer. Trainers can only see and manage their own classes and clients.

### Business rules
- **Booking:** needs an active membership. Classes can't be overbooked, even when two people book at the same moment.
- **Booking limits:** each member has a weekly booking limit, and bookings can't be cancelled close to the class start. Admins set both in **Settings**.
- **Subscribing:** starting or switching a plan cancels the current membership, creates a new one and records a payment.
- **Expiry:** memberships past their end date are marked **expired** automatically.
- **Deleting a class** cancels its bookings.
- **Plans** that members have used can't be deleted, only turned off.
- **Trainers** with upcoming classes can't be deleted.

---

## API reference

Base URL: `/api/v1`.
- **Responses:** single items come back as `{ success, data }`, lists as `{ success, data, total, page, pages }`.
- **Errors:** `{ success: false, message, errors? }`, where `errors` maps form fields to messages.
- **Lists:** accept `?page`, `?limit` and `?sort`. `sort=-createdAt` means newest first.

**Who** column: 🌐 public · 👤 any logged-in user · M member · T trainer · A admin.

| Area | Endpoints | Who |
| --- | --- | --- |
| **Auth** | `POST /auth/register` · `/auth/login` · `/auth/refresh` · `/auth/logout` · `/auth/forgot-password` · `/auth/reset-password` | 🌐 |
| | `GET /auth/me` | 👤 |
| **Profile** | `PATCH /users/me` · `POST /users/me/avatar` · `PATCH /users/me/password` | 👤 |
| **Users** | `GET/POST /users` · `GET/PUT/DELETE /users/:id` | A |
| **Plans** | `GET /plans` | 🌐 |
| | `POST /plans` · `PUT/DELETE /plans/:id` | A |
| **Memberships** | `GET /memberships/me` · `POST /memberships/subscribe` | M |
| | `PATCH /memberships/:id/cancel` | M, A |
| | `GET /memberships` · `PATCH /memberships/:id/freeze` | A |
| **Payments** | `GET /payments/me` | 👤 |
| | `GET /payments` | A |
| **Classes** | `GET /classes` · `GET /classes/:id` | 🌐 |
| | `POST /classes` · `PUT/DELETE /classes/:id` · `GET /classes/:id/roster` | T (own), A |
| **Bookings** | `POST /bookings` | M |
| | `GET /bookings/me` · `DELETE /bookings/:id` | 👤 |
| | `PATCH /bookings/:id/attend` | T (own), A |
| **Check-in** | `POST /attendance/checkin` · `GET /attendance/me` | 👤 |
| **Trainers** | `GET /trainers` · `GET /trainers/:id` | 🌐 |
| | `GET /trainers/:id/clients` | T (self), A |
| **Workouts** | `GET /workouts/me` · `POST /workouts` · `PUT/DELETE /workouts/:id` | 👤 (own) |
| **Workout plans** | `GET /workout-plans/me` · `PATCH /workout-plans/:id/days/:dayId/complete` | M |
| | `GET /workout-plans?member=` · `POST /workout-plans` · `PUT /workout-plans/:id` | T (clients), A |
| **Progress** | `GET /progress/me` · `POST /progress` · `DELETE /progress/:id` · `POST /progress/:id/photos` | 👤 (own) |
| | `GET /progress?member=` | T (clients), A |
| **Admin** | `GET /admin/stats` · `/admin/revenue` · `/admin/peak-hours` · `/admin/reports/export` · `GET/PUT /admin/settings` | A |
| **Health** | `GET /health` | 🌐 |

---

## Environment variables

### Backend (`server/.env` locally, or your host's dashboard in production)

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | — | Set to `production` on the live server |
| `PORT` | `5001` | Port the server listens on |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/fitverse` | MongoDB connection string. **Required in production.** |
| `JWT_ACCESS_SECRET` | dev-only value | Secret for access tokens. **Required in production**, 32+ characters. |
| `JWT_REFRESH_SECRET` | dev-only value | Secret for refresh tokens. **Required in production**, 32+ characters, different from the access secret. |
| `JWT_ACCESS_TTL` | `15m` | How long an access token lasts |
| `JWT_REFRESH_TTL_DAYS` | `7` | How long you stay logged in |
| `CLIENT_URL` | `http://localhost:5173` | Public site address, used in password-reset links. **Required in production.** |
| `CLIENT_DIST` | — | Path to the built frontend (e.g. `../dist`). When set, the server also serves the website. |
| `UPLOAD_DIR` | `./uploads` | Where uploaded photos are saved |
| `TRUST_PROXY` | `1` | Number of proxies in front of the app (Render, nginx, etc.) |
| `CLIENT_ORIGIN` | `http://localhost:5173` | Allowed origins, only if the website is hosted on a different domain |
| `COOKIE_SAMESITE` | `lax` | Use `none` only for a split-domain setup |
| `COOKIE_SECURE` | `true` in production | HTTPS-only login cookie |

Generate a secret with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Frontend (`.env` in the root folder)

| Variable | Default | Description |
| --- | --- | --- |
| `VITE_API_URL` | `/api/v1` | API address. Keep it as is unless the API is on another domain. |
| `VITE_PROXY_TARGET` | `http://localhost:5001` | Development only: where `/api` calls are forwarded |

---

## Deployment

The app deploys as **one service** that serves both the website and the API, plus a MongoDB database.

### Render + MongoDB Atlas (recommended)

**1. Database.** In [MongoDB Atlas](https://www.mongodb.com/atlas):
1. Create a free cluster.
2. Add a database user under **Database Access**.
3. Allow `0.0.0.0/0` under **Network Access**.
4. Copy the connection string and add `fitverse` before the `?`:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/fitverse?retryWrites=true&w=majority
   ```

**2. Web service.** On [Render](https://render.com), go to **New → Web Service**, connect this repository and fill in:

| Setting | Value |
| --- | --- |
| Runtime | **Node** |
| Build command | `npm ci && npm run build && cd server && npm ci --omit=dev` |
| Start command | `cd server && node src/server.js` |
| Health check path | `/api/v1/health` |

Add these environment variables:

| Name | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `CLIENT_DIST` | `../dist` |
| `MONGO_URI` | your Atlas connection string |
| `JWT_ACCESS_SECRET` | a random 32+ character string |
| `JWT_REFRESH_SECRET` | a different random string |
| `CLIENT_URL` | your Render address, e.g. `https://fitverse.onrender.com` |

You can also pick **Docker** as the runtime instead. Render then uses the included `Dockerfile` and you only need the last four variables.

**3. First admin.** Production starts with an empty database. Create your admin from your own computer, using the same Atlas connection string:

```bash
cd server
MONGO_URI='your-atlas-connection-string' \
ADMIN_NAME="Your Name" ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='StrongPass123' \
node src/createAdmin.js
```

On a paid Render plan you can run the same command in the service's **Shell** tab instead. Then log in and set up **Settings → Plans → Trainers → Classes**.

**4. Check it.** `https://your-app.onrender.com/api/v1/health` should return `{"success":true,"status":"ok"}`.

### Self-hosting with Docker Compose

```bash
cp .env.production.example .env.production   # fill in secrets and CLIENT_URL
docker compose up -d --build                 # app on 127.0.0.1:8080 + MongoDB
docker compose exec -e ADMIN_EMAIL=you@example.com -e ADMIN_PASSWORD='StrongPass123' app node src/createAdmin.js
```

Put an HTTPS reverse proxy in front of it. With [Caddy](https://caddyserver.com), the whole config is:
```
your-domain.com {
    reverse_proxy 127.0.0.1:8080
}
```

### Updating the live site
Push to GitHub and Render redeploys automatically:
```bash
git add .
git commit -m "Describe your change"
git push
```

---

## Security

- **Passwords:** hashed with bcrypt. They're never returned by the API.
- **Tokens:**
  - Access token kept in memory only. Refresh token in an httpOnly, Secure, SameSite cookie, replaced on every use.
  - Logging out or changing your password signs out your other sessions.
- **Access control:** role and ownership checks on every endpoint. Users can only see or change their own data.
- **Rate limits:** 300 API requests per minute per IP, and 30 attempts per 15 minutes for login, register and password reset.
- **Security headers:**
  - Strict Content-Security-Policy. The only outside source allowed is Google Fonts.
  - HSTS, clickjacking protection and the other Helmet defaults.
- **Input validation** on every form, with clear field-level error messages.
- **Uploads:** images only, with size limits and random file names.
- **CSV exports** protected against spreadsheet formula injection.
- **Production safety:**
  - The server refuses to start without proper secrets.
  - The demo-data script can't run in production.
  - The Docker container runs as a non-root user.

---

## Known limitations

| Limitation | Effect | How to fix |
| --- | --- | --- |
| **No payment provider** | Subscribing records a payment as paid immediately, without charging | Add Stripe in `server/src/routes/memberships.js` |
| **No email service** | Password-reset links are only written to the server log | Connect an email service in `server/src/routes/auth.js` |
| **Photos stored on the server's disk** | On Render's free plan, uploaded photos disappear when the app restarts | Add a persistent disk (paid), or move uploads to Cloudinary or S3 |
| **Free hosting sleeps** | On Render's free plan, the first visit after 15 idle minutes takes about 30–60 seconds | Upgrade the Render plan |
| **No automated tests** | Changes need to be checked by hand | Add Jest/Vitest and Supertest tests |

---

## Author

Built by **[indira7-kosaraju](https://github.com/indira7-kosaraju)**.
