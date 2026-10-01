# FitVerse — Frontend

> Backend: [server/](server/README.md). Deploying: [DEPLOYMENT.md](DEPLOYMENT.md).

React 18 + Vite frontend for **FitVerse**, a gym & fitness management app with three roles: **member**, **trainer** and **admin**. It talks to a separate Node/Express/MongoDB REST API that uses JWT auth.

**Stack:** React 18 (JS), react-router-dom v6, axios, Context API + useReducer, CSS Modules, recharts, react-hot-toast. There is no UI kit, Redux, TypeScript or Tailwind.

---

## Quick start

```bash
# 1. Install
npm install

# 2. Configure (defaults work if the API runs on :5001)
cp .env.example .env

# 3. Start the backend (see server/README.md), then:
npm run dev          # http://localhost:5173
```

### Scripts

| Script            | What it does                                    |
| ----------------- | ----------------------------------------------- |
| `npm run dev`     | Vite dev server with HMR and the `/api` proxy   |
| `npm run build`   | Production build into `dist/`                   |
| `npm run preview` | Serves the production build locally             |

### Environment variables

| Variable            | Default                 | Purpose                                                                                       |
| ------------------- | ----------------------- | --------------------------------------------------------------------------------------------- |
| `VITE_API_URL`      | `/api/v1`               | Base URL for all API calls. Keep it relative in dev so requests go through the Vite proxy.    |
| `VITE_PROXY_TARGET` | `http://localhost:5001` | Dev only. The backend origin that `/api/*` is proxied to. Avoid port 5000 on macOS: AirPlay Receiver uses it and answers every request with 403. |

## Connecting to the backend

**Development.** The browser calls `http://localhost:5173/api/v1/...` and Vite proxies it to `VITE_PROXY_TARGET` (see `vite.config.js`). Because the frontend and API share an origin, the httpOnly refresh-token cookie just works. You don't need any CORS configuration.

**Production.** Pick one:

1. **Same origin (recommended).** Serve `dist/` and reverse-proxy `/api` to the API (nginx, Caddy, or Express `static`). Keep `VITE_API_URL=/api/v1`.
2. **Separate origins.** Build with `VITE_API_URL=https://api.example.com/api/v1`. The API then needs:
   - CORS with `credentials: true` and the exact frontend origin. A wildcard (`*`) won't work.
   - A refresh cookie set with `SameSite=None; Secure`.

### Auth flow

- `POST /auth/login` and `/auth/register` return `{ user, accessToken }`. The server sets the refresh token as an **httpOnly cookie**.
- The access token is kept **only in memory**: in `AuthContext` state and in a module variable in `src/api/axios.js`. It is never written to localStorage.
- Every request gets `Authorization: Bearer <token>` from a request interceptor.
- On a **401**, the response interceptor calls `POST /auth/refresh` (`withCredentials`) **once**, stores the new token and retries the original request. Concurrent 401s share a single refresh call. If the refresh fails, the session is cleared, a toast appears and `ProtectedRoute` redirects to `/login`.
- On app load, `AuthContext` calls `/auth/refresh` and then `GET /auth/me` to restore the session.

### Response conventions the client expects

- List endpoints return `{ data, total, page, pages }` and accept `?page&limit&sort` (`sort=-createdAt` means descending). Bare arrays are also accepted.
- Single-resource endpoints may return the object directly or wrap it as `{ data: object }`.
- Errors look like `{ success: false, message, errors?: { field: message } }`. `message` is shown as a toast or banner, and `errors` appear inline under the matching form fields.

### Endpoints assumed beyond the base contract

The base contract doesn't cover a few features, so the client assumes these endpoints. Implement them in the backend, or change the matching function in `src/api/*`:

| Feature                         | Assumed call                                                                     | Defined in         |
| ------------------------------- | -------------------------------------------------------------------------------- | ------------------ |
| Change password                 | `PATCH /users/me/password { currentPassword, newPassword }`                      | `authApi.js`       |
| Emergency contact               | Part of `PATCH /users/me { emergencyContact: { name, phone, relation } }`        | `authApi.js`       |
| Admin creates a trainer         | `POST /users { name, email, password, role: 'trainer', ... }`                    | `adminApi.js`      |
| Gym settings                    | `GET /admin/settings`, `PUT /admin/settings`                                     | `adminApi.js`      |
| Trainer views client progress   | `GET /progress?member=:id&from&to`                                               | `progressApi.js`   |
| Trainer loads a client's plan   | `GET /workout-plans?member=:id`                                                  | `workoutApi.js`    |
| Update a plan                   | `PUT /workout-plans/:id` (the body also includes `_id`)                          | `workoutApi.js`    |
| Reactivate a frozen membership  | `PATCH /memberships/:id/freeze { freeze: false }`                                | `membershipApi.js` |
| Mark attendance                 | `PATCH /bookings/:id/attend { status: 'attended' \| 'no_show' }`                 | `bookingApi.js`    |
| Class roster shape              | `[{ _id, user: { _id, name, email, avatarUrl }, status }]`                       | `classApi.js`      |
| Admin user list filters         | `GET /users?role&search&status&sort` with `membership` populated on each user     | `adminApi.js`      |
| Recurring classes               | Done on the client: one `POST /classes` per occurrence                           | `ClassForm.jsx`    |

---

## Architecture

```
src/
  api/          axios instance + interceptors, one module per resource
  context/      AuthContext (useReducer: user, token, status), ThemeContext (useReducer, persisted)
  hooks/        useAuth, useFetch (loading/error/refetch/setData), useDebounce, useChartColors
  components/
    layout/     AppLayout (sidebar ≥1024px, bottom nav below), Navbar, Sidebar, MobileNav, PageHeader, AuthLayout
    common/     Button, Input, Select, Modal (dialog + drawer), ConfirmDialog, Card, Badge, Spinner,
                Skeleton, EmptyState, ErrorState, Table, Pagination, FileUpload, Toggle, Tabs, Avatar,
                ProgressBar, StatCard, ClassCard, Icon (inline SVG), Logo
    forms/      LoginForm, RegisterForm, WorkoutForm, ProgressForm, ClassForm, PlanForm, TrainerForm
    trainer/    RosterModal, PlanBuilder
  pages/        public/ member/ trainer/ admin/  (all lazy-loaded per route)
  routes/       AppRoutes, ProtectedRoute (+ GuestRoute), RoleRoute
  styles/       variables.css (design tokens, dark + light), global.css, *.module.css
  utils/        formatDate, formatCurrency, validators, constants
```

- **Routing.** `/` is public. `/login`, `/register`, `/forgot-password` and `/reset-password/:token` are guest-only. `/app/*` is for members, `/trainer/*` for trainers and `/admin/*` for admins. A signed-in user on the wrong role's area is sent to `/403`, and unknown routes go to the 404 page. Every page is loaded with `React.lazy` + `Suspense`.
- **State.** Auth and theme are global (Context + `useReducer`). Everything else is page-local server state loaded through `useFetch`. Optimistic updates (bookings, plan-day completion, plan toggles) roll back if the request fails.
- **Styling.** CSS Modules backed by CSS custom properties. The theme is set by `data-theme` on `<html>`, stored in localStorage (`fitverse-theme`) and defaults to dark. An inline script in `index.html` applies the saved theme before first paint to avoid a flash. Recharts colours are read from the tokens at runtime via `useChartColors`.
- **Validation.** Rules and schemas live in `utils/validators.js`. Forms validate before submitting, and server `errors` are merged into the inline field errors.
- **Accessibility.**
  - Skip link, and focus moves to `<main>` on route change.
  - Modals trap focus, close on Esc and restore focus when closed.
  - Tabs follow the ARIA pattern with arrow-key navigation.
  - Toggles use `role="switch"`.
  - Every input has a label, and icon-only buttons have `aria-label`s.
  - Animations respect `prefers-reduced-motion`.
