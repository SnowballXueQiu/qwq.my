# syntax=docker/dockerfile:1
# qwq.my — a standalone Next.js server. Build: docker compose build (see README).
ARG NODE_IMAGE=node:22-alpine

FROM ${NODE_IMAGE} AS deps
WORKDIR /app
# npm registry for pnpm itself (via corepack) and for packages; the server uses a mirror.
ARG NPM_REGISTRY=https://registry.npmjs.org
ENV COREPACK_NPM_REGISTRY=${NPM_REGISTRY} npm_config_registry=${NPM_REGISTRY}
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM ${NODE_IMAGE} AS build
WORKDIR /app
ARG NPM_REGISTRY=https://registry.npmjs.org
ENV COREPACK_NPM_REGISTRY=${NPM_REGISTRY} npm_config_registry=${NPM_REGISTRY} NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM ${NODE_IMAGE} AS run
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO /dev/null http://127.0.0.1:3000/zh || exit 1
CMD ["node", "server.js"]
