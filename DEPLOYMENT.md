# Deploying FitVerse

FitVerse ships as **one Docker image**. The Express API serves the built React app and the REST API from the same origin, so no CORS or cross-site cookies are needed. You need:

- A host that runs Docker containers (Render, Railway, Fly.io, a VPS…)
- A MongoDB database. MongoDB Atlas has a free tier, or use the Mongo container in `docker-compose.yml`.
- HTTPS. Hosted platforms provide it; on a VPS put Caddy or nginx in front.

## 1. Configure

Set these environment variables in your host's dashboard, or in `.env.production` for Docker Compose. Start from [.env.production.example](.env.production.example).

| Variable             | Required | Notes                                                                                        |
| -------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `MONGO_URI`          | yes      | e.g. `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/fitverse` (Compose sets it for you) |
| `JWT_ACCESS_SECRET`  | yes      | 32+ random characters                                                                        |
| `JWT_REFRESH_SECRET` | yes      | 32+ random characters, **different** from the access secret                                  |
| `CLIENT_URL`         | yes      | Public URL of the site, e.g. `https://fitverse.example.com` (used in password-reset links)   |
| `TRUST_PROXY`        | no       | Reverse proxies in front of the app. Default `1`, right for hosted platforms and Caddy/nginx |
| `PORT`               | no       | Default `8080`                                                                               |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The server refuses to start in production if a secret is missing, too short, or both secrets are the same.

## 2. Deploy

### Option A: Hosted platform (Render, Railway, Fly.io)

1. Push this folder to a Git repository. The `.gitignore` files keep `.env` files and `node_modules` out.
2. Create a new web service from the repo and choose **Docker**. It uses the root `Dockerfile`.
3. Add the environment variables from step 1. Set the health check path to `/api/v1/health`.
4. Attach a **persistent disk** mounted at `/data/uploads`. Without one, avatars and progress photos are lost on every redeploy.
5. In MongoDB Atlas, allow connections from your host's outbound IPs under Network Access.

### Option B: Your own server with Docker Compose

```bash
cp .env.production.example .env.production   # fill in the secrets and CLIENT_URL
docker compose up -d --build
```

This starts the app on `127.0.0.1:8080` and MongoDB with persistent volumes. Put HTTPS in front of it. With Caddy, the whole config is:

```
fitverse.example.com {
    reverse_proxy 127.0.0.1:8080
}
```

## 3. Create the first admin

Production has no demo accounts. `npm run seed` refuses to run when `NODE_ENV=production`. Create the real admin once:

```bash
# Docker Compose
docker compose exec -e ADMIN_NAME="Your Name" -e ADMIN_EMAIL=you@example.com -e ADMIN_PASSWORD='a-strong-password1' app node src/createAdmin.js

# Hosted platform: run the same command in the service's shell/console
ADMIN_NAME="Your Name" ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-strong-password1' node src/createAdmin.js
```

Running it again for the same email resets that account's password and makes it an admin.

Then log in, and:
- Add trainers under **Admin → Trainers**.
- Create membership plans under **Admin → Plans**.
- Fill in gym details and booking policies under **Admin → Settings**.

## 4. Check it

- `https://your-domain/api/v1/health` returns `{"success":true,"status":"ok"}`. It returns 503 if the database is down.
- The landing page shows your plans, trainers and this week's classes.
- Log in as the admin. Reload the page and you should stay logged in.

## What's included

- **Security:**
  - Strict Content-Security-Policy, with the inline theme script allowed by hash.
  - HSTS and the other Helmet headers.
  - httpOnly, Secure, SameSite refresh cookie.
  - Rate limits: 300 requests/min per IP for the API, 30 per 15 min for login/register/password reset.
  - Role checks on every endpoint.
  - Upload type and size limits with random file names.
  - CSV exports protected against formula injection.
- **Performance:**
  - Gzip compression.
  - Hashed assets cached for a year; `index.html` always revalidated.
  - API responses are never cached.
- **Operations:**
  - The container runs as a non-root user.
  - Docker health check.
  - Graceful shutdown on `SIGTERM`.
  - Access logs in combined format, with health checks excluded.
  - Fails fast on missing configuration.

## Known limitations

- **No payment provider.** Subscribing records a paid payment immediately. Integrate Stripe or similar in `server/src/routes/memberships.js` before taking real money.
- **No email provider.** Password-reset links are written to the server log (search for `[password reset]`). Hook up an email service in `server/src/routes/auth.js`.
- **Uploads are stored on local disk.** This works with one instance and a persistent volume. To run several instances, move uploads to object storage (S3, R2, Cloudinary).
- **Rate limits are per instance**, kept in memory. Use a shared store such as Redis if you scale out.
- **Backups:** turn on automated backups in Atlas, or back up the `mongo-data` volume.

## Split deployment (optional)

To host the frontend separately, e.g. on Vercel or Netlify:
1. Build it with `VITE_API_URL=https://api.example.com/api/v1`.
2. On the API, set `CLIENT_ORIGIN=https://app.example.com` and `COOKIE_SAMESITE=none`.
3. Leave `CLIENT_DIST` unset.

The same-origin setup above is simpler and recommended.
