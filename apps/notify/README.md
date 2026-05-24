# notify

Notifications service. Accepts send-notification requests, resolves
recipient details from iam over gRPC, persists the notification with
status `pending`, then asynchronously flips it to `sent` after a
simulated delivery delay.

## Contracts exposed

- **REST** (`http://localhost:3002`):
  - `POST /notifications` — send a notification (calls iam.GetUser)
  - `GET /notifications` — list (v2 shape)
  - `GET /notifications/:id` — get one (v1 minimal, v2 full payload;
    selected via `X-Orbit-Api-Version` header)
  - `GET /health/live`, `GET /health/ready` — probes (public)
  - `GET /metrics` — Prometheus scrape endpoint
  - `GET /docs` — Swagger UI
- **gRPC** (`localhost:50052`, `notify.NotifyService`):
  - `SendNotification(SendNotificationRequest) → Notification`

  Marked `@InternalOnly()` — same auth model as iam's gRPC.

Proto: `libs/contracts/notify/protos/notify.proto`. Generated TS:
`libs/contracts/notify/src/generated/notify.ts`.

## External dependencies

- **iam** — read-only call to `iam.IamService/GetUser` to resolve the
  recipient. URL is resolved via `@orbit/service-registry`
  (`registry.grpcUrl('iam')`); no direct env var is read.
- Future: Postgres (currently in-memory), real email/SMS transports
  (currently the dispatcher emulates delivery with a 100–2000ms
  setTimeout).

## Run locally

```sh
# Direct (requires iam running on :50051):
pnpm start:dev:iam &
pnpm start:dev:notify

# Via compose (notify waits for iam to be healthy):
make dev
```

## Environment

Validated by `src/config/env.schema.ts`.

Notable optionals:
- `NOTIFY_HTTP_PORT`, `NOTIFY_GRPC_PORT` — bind ports (default 3002 / 50052)
- `ORBIT_ENV` — `local | compose | k8s` (drives iam URL resolution)
- `IAM_GRPC_TIMEOUT_MS` — per-call deadline for iam.GetUser (default 5000)
- `OTEL_ENABLED=1` + `OTEL_EXPORTER_OTLP_ENDPOINT` — enable tracing

## Custom metrics

- `notifications_dispatched_total{channel,status}` — every dispatch
  attempt; `status` is `dispatched`, `delivered`, or `failed`.

## Tests

```sh
pnpm test apps/notify
```

The `notify-iam.grpc.e2e-spec` test overrides `IamClient` with a mock
so the suite does not require iam to be running.
