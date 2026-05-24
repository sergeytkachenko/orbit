# 0008 — tsc-built libs, single root Dockerfile, runtime resolution via dist/

- Status: Accepted
- Date: 2026-05-24

## Context

The challenge requires "a single Dockerfile at the root that can be
used to build and run any service" and a layout that scales to 10+
services with no per-service editing of the build pipeline.

A naive layout that works for one or two services breaks at scale on
three concrete points:

- Per-service `apps/<svc>/Dockerfile` files force every Dockerfile to
  enumerate `COPY apps/<other-svc>/package.json` lines so `pnpm
  install` can resolve the workspace. Adding a service means editing
  every existing Dockerfile.
- `libs/*/package.json` pointing at `src/index.ts`
  (`"main": "src/index.ts"`) works in Nest's dev flow because
  `nest build` inlines libs via TS path mappings, but Node cannot
  execute TypeScript at runtime — so any image that ran
  `node dist/apps/<svc>/main.js` had to either ship a TS loader hook,
  rewrite require paths, or use `pnpm deploy` with
  `inject-workspace-packages=true` (which copies `*.ts` files into
  node_modules and crashes the same way).
- A latent circular dependency between `@orbit/common` and
  `@orbit/transport-grpc` was hidden by nest's parallel build but
  blocks `tsc -b`'s project references.

## Decision

Treat every `libs/<lib>` as a standalone tsc-built npm package, run a
single zero-touch Dockerfile, and let Node's standard resolver find
compiled JS through pnpm's workspace symlinks. Concretely:

**libs as real packages.** Each `libs/<lib>/package.json` publishes:

```json
{
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": { "build": "tsc -p tsconfig.lib.json" }
}
```

`tsconfig.lib.json` sets `composite: true`, `outDir: "./dist"`,
`rootDir: "src"`, `declarationMap: true`. A root
`tsconfig.libs.json` lists every lib as a `references[]` entry so
`tsc -b` builds the whole graph incrementally. Libs are not
registered in `nest-cli.json projects` — they are built by tsc
directly.

**Apps build into local dist.** `apps/<svc>/tsconfig.app.json` uses
`outDir: "./dist"`, so the entry point is `apps/<svc>/dist/main.js`.
Each runtime tree is co-located with the package that owns it.

**Single root Dockerfile.** One `Dockerfile` at the repo root, fully
zero-touch for new services:

```dockerfile
ARG SERVICE_NAME

FROM node:22-alpine AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps ./apps
COPY libs ./libs
RUN pnpm install --frozen-lockfile
COPY tsconfig.json tsconfig.libs.json tsconfig.build.json nest-cli.json ./
ARG SERVICE_NAME
RUN pnpm build:libs && pnpm exec nest build "${SERVICE_NAME}"
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

FROM node:22-alpine AS runtime
ARG SERVICE_NAME
ENV SERVICE_NAME=${SERVICE_NAME} NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps ./apps
COPY --from=build /repo/libs ./libs
CMD ["sh", "-c", "exec node apps/${SERVICE_NAME}/dist/main.js"]
```

The Dockerfile never enumerates services or libs. Adding a service is
`pnpm new:service <name>` + `docker build --build-arg SERVICE_NAME=<name>`.

**Runtime resolution.** pnpm's workspace symlinks
(`apps/<svc>/node_modules/@orbit/common → ../../libs/common`) plus
`"main": "dist/index.js"` in each lib mean Node resolves `@orbit/*`
imports straight into compiled JS. No loader hook, no
`tsconfig-paths/register`, no path traversal in `package.json`.

**Cycle broken.** `withGrpc` lives in `libs/transport-grpc/src/`, not
in `@orbit/common`. `bootstrapService` accepts
`extras: Configurator[]`; apps pass `withGrpc(...)` from
`@orbit/transport-grpc` themselves. `@orbit/transport-grpc` depends
on `@orbit/common` (one direction); `@orbit/common` has no
workspace deps.

**Enforcement.** `pnpm check:circular` combines two checks:
1. `scripts/check-workspace-cycles.js` — Tarjan SCC on the
   `workspace:*` graph derived from `package.json`s.
2. `madge --circular` — TS-import-level cycles inside packages.

The combined check runs in GitHub Actions
(`.github/workflows/ci.yml`) before typecheck/lint/test, so any new
cycle fails the build.

## Consequences

Positive:
- Single root Dockerfile that does not enumerate services. Adding a
  service requires no Dockerfile edit.
- No more "works in dev, breaks in Docker" surprises — local
  `pnpm build && node apps/<svc>/dist/main.js` and the Docker image
  use the exact same resolution path.
- `tsc -b` gives incremental, dependency-aware builds; libs build
  once per change and downstream consumers reuse cached output.
- Workspace cycles are caught structurally before merge (CI gate).
- libs look like ordinary npm packages — `main: dist/index.js`,
  `files: ["dist"]` — so any future `npm publish` is straightforward.

Negative:
- Runtime image carries the full workspace tree under `apps/` and
  `libs/` rather than a `pnpm deploy --prod` slim copy. Net size is
  roughly 150 MB; trading a few MB for the zero-touch property is
  the right call for a 10-service horizon. Slim-mode can be added
  later by replacing the runtime stage's `COPY` with a `pnpm deploy`
  invocation once libs have stable package contracts.
- pnpm's `inject-workspace-packages` flag must stay **off**. Turning
  it on inlines TS sources into node_modules and breaks runtime
  resolution. Documented in this ADR.
- Per-service image isolation is gone. Any change to a shared lib
  rebuilds every service's image. Acceptable for the zero-touch
  property; if independent rebuilds matter later, re-introduce
  per-service tags driven by source-path filters in CI.
