# iam

Identity & access service. Owns the `User` aggregate (id, email,
displayName, createdAt) and is the single source of truth for user
records.

## Contracts exposed

- **REST** (`http://localhost:3001`):
  - `POST /users` — create a user
  - `GET /users` — list users (v2 shape)
  - `GET /users/:id` — get user (v1 = id+email, v2 = full profile;
    selected via `X-Orbit-Api-Version` header)
  - `PATCH /users/:id` — update
  - `DELETE /users/:id` — delete
  - `GET /health/live`, `GET /health/ready` — k8s probes (public)
  - `GET /metrics` — Prometheus scrape endpoint
  - `GET /docs` — Swagger UI
- **gRPC** (`localhost:50051`, `iam.IamService`):
  - `GetUser(GetUserRequest) → User`
  - `CreateUser(CreateUserRequest) → User`

  All gRPC methods are `@InternalOnly()` — they require
  `x-internal-token` in metadata when `ORBIT_INTERNAL_TOKEN` is set.

Proto: `libs/contracts/iam/protos/iam.proto`. Generated TS:
`libs/contracts/iam/src/generated/iam.ts`. Regenerate after editing
the proto with `pnpm proto:gen`.

## External dependencies

- None yet (in-memory repository).
- Will gain Postgres in the future (see [`docs/CONSTITUTION.md`](../../docs/CONSTITUTION.md) §7).

## Run locally

```sh
# Direct:
pnpm start:dev:iam

# Via compose (alongside notify + Jaeger):
make dev
```

Demo users seed: `apps/iam/demousers.json` is loaded on first boot if
the repository is empty. Override with `DEMO_USERS_PATH`.

## Environment

Validated by `src/config/env.schema.ts`. Required keys are listed
there; the service refuses to start if any are missing or malformed.

Notable optionals:
- `IAM_HTTP_PORT`, `IAM_GRPC_PORT` — bind ports (default 3001 / 50051)
- `ORBIT_ENV` — `local | compose | k8s` (drives service discovery)
- `OTEL_ENABLED=1` + `OTEL_EXPORTER_OTLP_ENDPOINT` — enable tracing
- `ORBIT_API_KEY` — required in production for HTTP auth
- `ORBIT_INTERNAL_TOKEN` — required in production for gRPC `@InternalOnly()`

## Tests

```sh
pnpm test                       # runs every spec in the repo
pnpm test apps/iam              # just iam's specs
```
