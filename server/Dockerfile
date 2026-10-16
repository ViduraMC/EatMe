# Production image for the EatMe API, run on Google Cloud Run (see RELEASE.md).
# Local development does not use this; it runs "npm run dev" as before.

# ---- build: install everything, generate the Prisma client, compile TypeScript
FROM node:22-bookworm-slim AS build
# Prisma's query engine needs OpenSSL to detect the right engine build.
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---- run: only what the server needs, as a non-root user
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
# Production dependencies only. --omit=optional also drops prisma and
# typescript, which @prisma/client lists as optional peers. Install scripts are
# off: the Prisma client they would generate is copied in ready-made below.
RUN npm ci --omit=dev --omit=optional --ignore-scripts && npm cache clean --force
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist
USER node
# Cloud Run sends traffic to $PORT (8080); env.ts reads it.
EXPOSE 8080
CMD ["node", "dist/server.js"]
