# syntax=docker/dockerfile:1
# Keep this tag aligned with .nvmrc; pin the resolved digest in your release registry.
FROM node:24.22.1-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm install --global npm@11.19.0

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3200
COPY . .
# This public origin is embedded in canonical URLs/sitemap by Next at build time.
# Release builds must override it with the target environment's CMS_SERVER_URL.
# Request-time CMS routes must be built with CMS enabled. These are disposable
# build values, never production credentials; a build must not query this DB.
RUN CMS_ENABLED=true \
    CMS_SERVER_URL=http://localhost:3100 \
    DATABASE_URL=postgresql://build:build@127.0.0.1:1/build_unavailable \
    PAYLOAD_SECRET=build-only-placeholder-never-used-for-a-running-server \
    METRIKA_ENABLED=false \
    NEXT_PUBLIC_SITE_URL="$NEXT_PUBLIC_SITE_URL" \
    npm run build:production

# One-shot migrations/bootstrap/seed need the pinned development CLI dependencies.
# Never run migration commands from every web replica's startup command.
FROM builder AS operations
ENV NODE_ENV=production CMS_ENABLED=true
RUN mkdir -p .local/uploads && chown -R node:node .local
USER node
CMD ["npm", "run", "cms:migrate"]

FROM base AS production-dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM base AS runtime
ENV NODE_ENV=production CMS_ENABLED=true NEXT_BUILD_DIR=.next-production
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next-production ./.next-production
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/src ./src
COPY --from=builder --chown=node:node /app/package.json /app/next.config.ts /app/payload.config.ts /app/tsconfig.json ./
RUN mkdir -p .local/uploads && chown -R node:node .local
USER node
EXPOSE 3100
CMD ["node", "node_modules/next/dist/bin/next", "start", "--hostname", "0.0.0.0", "--port", "3100"]
