# 0005 — Composable bootstrap via ServiceBuilder + `with*()` modules

- Status: Accepted
- Date: 2026-05-24

## Context

The original `bootstrapService(cfg)` was a single function that knew
about HTTP, gRPC, Swagger, Pino, validation, custom versioning,
correlation middleware, exception filters, and shutdown hooks. For the
two HTTP+gRPC services we have today it works fine; for the next
service that is, say, a worker without HTTP, it does not — the
function bakes in `app.listen(httpPort)`.

We want a uniform pipeline that includes the mandatory global concerns
(logger, validation, correlation, errors, versioning, shutdown hooks)
but allows each service to declare which transports / surfaces it
opts into.

## Decision

Introduce `ServiceBuilder` (in `libs/common/src/bootstrap/`) with
small `with*()` configurators:

- `withHttp({ port })` — `app.listen(port)`
- `withGrpc({ packageName, protoPath, port })` — attaches the gRPC
  microservice and the inbound `GrpcCorrelationInterceptor` (lives
  in `@orbit/transport-grpc`, not `@orbit/common`; see ADR 0008)
- `withSwagger({ title, description })` — mounts `/docs`
- `withMetrics()` — Prometheus registry + `/metrics` endpoint
- `withTracing()` — OpenTelemetry status logging (see ADR 0006)

`ServiceBuilder.run()` always applies the non-negotiable globals (Pino
logger, `RequestContextMiddleware`, custom versioning extractor,
`ValidationPipe`, `AllExceptionsFilter`, `enableShutdownHooks()`), then
runs the configurators in order, then `startAllMicroservices()`.

`bootstrapService(cfg)` (the legacy function) is kept as a thin facade
that composes `withGrpc + withSwagger + withHttp`. Existing
`apps/iam/src/main.ts` and `apps/notify/src/main.ts` continue to work
unchanged. New services should compose `ServiceBuilder` directly when
they need anything other than the standard HTTP+gRPC shape.

## Consequences

Positive:
- A worker-only service is now trivial: omit `withHttp`.
- Adding a new global concern is a new `with*` module without
  touching every `main.ts`.
- The mandatory pipeline lives in one place and cannot be silently
  dropped by a service.

Negative:
- Two ways to bootstrap (`bootstrapService` facade vs. raw
  `ServiceBuilder`). Drift risk if the facade is not updated when a new
  global is added. We mitigate by having `ServiceBuilder.run()` own the
  globals — the facade only chooses which optional `with*` modules to
  add.
- `bootstrapService` accepts `extras: Configurator[]` so
  transport-specific configurators (e.g. `withGrpc` from
  `@orbit/transport-grpc`) are passed in by the caller. Keeps
  `@orbit/common` free of transport-specific imports — see ADR 0008.

Neutral:
- Builder pattern (over a config object) was chosen for readability:
  the call site shows exactly which surfaces the service exposes.
