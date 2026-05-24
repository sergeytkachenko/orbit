# syntax=docker/dockerfile:1.6
#
# Single shared Dockerfile for the whole monorepo. Designed to stay
# untouched as new services are added — it doesn't enumerate apps or
# libs anywhere.
#
# Examples (run from the repo root):
#   docker build --build-arg SERVICE_NAME=iam    -t orbit-iam    .
#   docker build --build-arg SERVICE_NAME=notify -t orbit-notify .

ARG SERVICE_NAME

# ---------- Stage 1: build ----------
FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@10.13.1 --activate

# Install workspace deps. Copying apps+libs (and not just manifests)
# is intentional: the list of workspace packages is dynamic — listing
# manifests explicitly would force a Dockerfile edit on every new
# service. The cost is a wider invalidation cache, which is fine for
# the build pipeline.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps ./apps
COPY libs ./libs
RUN pnpm install --frozen-lockfile

COPY tsconfig.json tsconfig.libs.json tsconfig.build.json nest-cli.json ./
COPY scripts ./scripts

ARG SERVICE_NAME
RUN test -n "${SERVICE_NAME}" || (echo "SERVICE_NAME build-arg is required" && exit 1)

# Build every lib (tsc -b), then the requested service (nest build).
# tsc respects project references so unchanged libs get cached output.
RUN pnpm build:libs && pnpm exec nest build "${SERVICE_NAME}"

# Prune dev dependencies — runtime only needs prod deps for the
# selected app + its transitive workspace libs.
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# ---------- Stage 2a: dev (watch mode) ----------
# Used by docker-compose.dev.yml. Keeps the full pnpm workspace + Nest
# CLI from the build stage and runs `nest start --watch`, which
# recompiles the requested app on every TS change. Sources are pushed
# in by `docker compose watch` (sync action) — no bind mounts.
FROM build AS dev
ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}
ENV NODE_ENV=development
WORKDIR /repo
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=5 \
    CMD test -z "${HEALTH_PORT}" || wget -qO- "http://127.0.0.1:${HEALTH_PORT}/health/live" || exit 1
CMD ["sh", "-c", "pnpm build:libs && exec pnpm exec nest start ${SERVICE_NAME} --watch --preserveWatchOutput"]

# ---------- Stage 2: runtime ----------
FROM node:22-alpine AS runtime
ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME}
ENV NODE_ENV=production
WORKDIR /app
RUN chown -R node:node /app
USER node

# Copy the whole workspace tree minus dev deps. node_modules under
# apps/<svc>/ holds the pnpm-managed symlinks into ../../libs/<lib>,
# and each lib publishes `main: dist/index.js` so Node resolves
# `@orbit/*` straight into compiled JS — no loader hook needed.
COPY --from=build --chown=node:node /repo/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps ./apps
COPY --from=build --chown=node:node /repo/libs ./libs

# Image-level health probe. The image doesn't know which port the
# service binds (it differs per service), so the probe respects a
# `HEALTH_PORT` env var. The orchestrator (compose, k8s) sets it
# alongside the service's HTTP port env var. Standalone `docker run`
# also needs `-e HEALTH_PORT=<port>` to enable the check.
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
    CMD test -z "${HEALTH_PORT}" || wget -qO- "http://127.0.0.1:${HEALTH_PORT}/health/live" || exit 1

CMD ["sh", "-c", "exec node apps/${SERVICE_NAME}/dist/main.js"]
