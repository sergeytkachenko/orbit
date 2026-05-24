# Orbit Backend Challenge

A small NestJS / TypeScript microservices monorepo: two services
(`iam`, `notify`) talking REST + gRPC, sharing code via `@orbit/*`
libs, built from a single root Dockerfile. Requires **Node 22+** and **pnpm 10+**.

```
HTTP ──▶ notify (REST + gRPC) ──gRPC──▶ iam (REST + gRPC)
                                              └─ Users CRUD (in-memory)
```

`POST /notifications` makes `notify` call `iam.IamService.GetUser` over gRPC and embeds the resolved user as `recipient`.

| Mode | iam HTTP | iam gRPC | notify HTTP | notify gRPC | Jaeger UI |
| --- | --- | --- | --- | --- | --- |
| `make dev` (compose) | `localhost:3050` | compose-only `iam:5000` | `localhost:3060` | compose-only `notify:5000` | `localhost:16686` |
| Local dev (no Docker) | `localhost:3001` | `localhost:50051` | `localhost:3002` | `localhost:50052` | — |

---

## 1. Quickstart — docker compose via make

```bash
make dev      # build + start iam and notify (detached)
make watch    # same, but nest --watch reloads on host edits
make clean    # stop + remove network/volumes
make          # list targets
```

### 1.1 Poking services under compose

HTTP is published to the host (`iam` → `3050`, `notify` → `3060`); gRPC stays on the compose network. To reach a gRPC port from the host, add a `ports:` mapping under the relevant service in `docker-compose.dev.yml` and re-run `make dev`.

```bash
curl localhost:3050/health/live          # iam
curl localhost:3060/health/live          # notify
curl localhost:3050/users                # two demo users seeded on first boot

# Cross-service call (notify → iam over gRPC):
curl -X POST localhost:3060/notifications \
  -H 'content-type: application/json' \
  -d '{"userId":"u_ada","channel":"email","subject":"hi","body":"hello"}'
```

- Swagger: <http://localhost:3050/docs>, <http://localhost:3060/docs>
- Jaeger UI: <http://localhost:16686> — pick service `iam` or `notify` in the top-left dropdown, *Find Traces*. Cross-service spans are joined by the same `x-correlation-id`.

### 1.2 Local dev without Docker

```bash
pnpm install
pnpm start:dev:iam       # terminal 1 — nest --watch, hot reload
pnpm start:dev:notify    # terminal 2
```

The `:dev` scripts run `nest start --watch` (TS compiled on the fly, no prior `pnpm build` needed). For a production-mode run, build once then start the compiled output: `pnpm build && pnpm start:iam` / `pnpm start:notify`.

```bash
curl localhost:3001/health/live          # iam
curl localhost:3002/health/live          # notify
curl localhost:3001/users

curl -X POST localhost:3002/notifications \
  -H 'content-type: application/json' \
  -d '{"userId":"u_ada","channel":"email","subject":"hi","body":"hello"}'
```

Swagger: <http://localhost:3001/docs>, <http://localhost:3002/docs>.

---

## 2. Structure & responsibility

| Path | Responsibility |
| --- | --- |
| `apps/iam` | Identity service. REST `/users`, gRPC `IamService { GetUser, CreateUser }`. In-memory repo. |
| `apps/notify` | Notifications service. REST `/notifications`, gRPC `NotifyService.SendNotification`. Calls `iam` over gRPC. |
| `libs/common` | Shared bootstrap, logger, exception filter, request context, health module, header-versioning. |
| `libs/transport-grpc` | gRPC server/client option factories + correlation interceptor. |
| `libs/contracts/{iam,notify}` | `.proto` files and generated TS types — one source of truth per service. |
| `libs/service-registry` | Resolves peer-service URLs from `ORBIT_ENV` (`local` \| `compose` \| `k8s`); `<NAME>_HTTP_PORT` / `<NAME>_GRPC_PORT` override the registered defaults. |
| `Dockerfile` | Single root image. `--build-arg SERVICE_NAME=iam\|notify` selects the app. |
| `install/compose/` | `docker-compose.dev.yml` wired by the Makefile. |
| `docs/adr/` | Architecture decision records. |

**Code reuse, three levels**

1. **Global libs** (`libs/*`) — consumed by both apps.
2. **Service-internal shared** (`apps/<svc>/src/**/shared/`) — validators + mappers reused by REST and gRPC controllers in one service.
3. **One handler, both transports** — e.g. `apps/iam/src/users/api/create-user.handler.ts` exposes `asRest()` and `asGrpc()`. Same validation, same persistence; only the output mapper differs.

**API versioning** — `X-Orbit-Api-Version: 1|2` header. Handlers declare
their version with `@ApiVersion('1')`; routing is done by Nest, no
`if (version === '2')` in app code. Absent/unknown → v1.

---

## 3. Best practices baked in

- **Single bootstrap** (`libs/common/src/bootstrap.ts`) — both `main.ts` files are ~15 lines. Pipes, interceptors, shutdown hooks added in one place.
- **Single exception filter for both transports** — `DomainError` subclasses map to HTTP *and* gRPC status codes. No per-controller try/catch.
- **gRPC client deadlines + error mapping** — timeouts / `UNAVAILABLE` / `DEADLINE_EXCEEDED` collapse to `UpstreamUnavailableError` (HTTP 504 / gRPC UNAVAILABLE).
- **gRPC keepalive** — 30s/10s defaults on server and client so idle connections through proxies don't break silently.
- **Correlation IDs** end-to-end — `x-correlation-id` header → Pino `reqId` → AsyncLocalStorage → gRPC metadata. Same id appears in both services' logs for a cross-service request.
- **Health probes** — `/health/live` and `/health/ready`. `notify` readiness pings `iam.GetUser` and reports `iam unreachable` on timeout.
- **Graceful shutdown** — `enableShutdownHooks()` drains HTTP + gRPC on SIGTERM/SIGINT.
- **Global `ValidationPipe`** with `whitelist` + `forbidNonWhitelisted`. Handler-level `assert*` is a second line (and the only line for the gRPC path).
- **Non-root Docker user + `HEALTHCHECK`** in the runtime image.
- **Single root Dockerfile** — adding a service touches no Dockerfile, no compose service list, no enumeration. See [ADR 0008](docs/adr/0008-tsc-libs-single-dockerfile.md).
- **CI cycle gate** — `pnpm check:circular` (workspace SCC + madge) runs before lint/typecheck/test.

```bash
pnpm lint typecheck test check:circular
```

---

## More

- Adding a service: [`docs/ADDING_A_SERVICE.md`](docs/ADDING_A_SERVICE.md)
- Architecture decisions: [`docs/adr/`](docs/adr)
- Env vars: [`.env.example`](.env.example)
