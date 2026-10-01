# syntax=docker/dockerfile:1

# ---- 1. Build the React frontend ----
FROM node:22-alpine AS client
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
# Same-origin deployment: the API is served from /api/v1 by the same container.
ENV VITE_API_URL=/api/v1
RUN npm run build

# ---- 2. Install API production dependencies ----
FROM node:22-alpine AS server-deps
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

# ---- 3. Runtime ----
FROM node:22-alpine
ENV NODE_ENV=production \
    PORT=8080 \
    CLIENT_DIST=/app/client \
    UPLOAD_DIR=/data/uploads
WORKDIR /app/server
COPY --from=server-deps /app/server/node_modules ./node_modules
COPY server/package.json ./
COPY server/src ./src
COPY --from=client /app/dist /app/client
RUN mkdir -p /data/uploads && chown -R node:node /data
USER node
EXPOSE 8080
VOLUME ["/data/uploads"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT}/api/v1/health || exit 1
CMD ["node", "src/server.js"]
