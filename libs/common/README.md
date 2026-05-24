# @orbit/common

Shared runtime building blocks every Orbit service depends on. The goal is to
keep service `main.ts` files thin and behavior consistent: any cross-cutting
concern that should look the same in every service lives here.

## Responsibility

- **Bootstrap** — `bootstrapService` facade and the composable `ServiceBuilder`
  (`withHttp`, `withGrpc`, `withSwagger`, `withMetrics`, `withTracing`). Services
  declare what they want, not how Nest wires it up.
- **Observability** — `startTracing()` (OpenTelemetry SDK, called first in
  `main.ts` so http/grpc/express auto-instrumentations attach at require time)
  and the shared Prometheus `metricsRegistry`.
- **Logging** — `SharedLoggerModule` (Pino) + `CORRELATION_ID_HEADER`.
- **Request context** — async-local store (`requestContext`,
  `getCurrentCorrelationId`) propagating correlation IDs across HTTP and gRPC.
- **Errors** — domain error classes (`NotFoundError`, `ValidationError`,
  `ConflictError`, `UpstreamUnavailableError`) and the `AllExceptionsFilter` that
  maps them to consistent HTTP/gRPC responses.
- **Health** — `HealthController` + `HealthModule` and the `READINESS_PROBES`
  registry contract for service-supplied readiness checks.
- **Versioning** — `@ApiVersion` decorator, header-based extractor, and the
  `API_VERSION_HEADER` / `DEFAULT_API_VERSION` constants.
- **Auth** — baseline `ApiKeyGuard` plus `@Public` / `@InternalOnly` decorators
  for the internal-token boundary.
- **Config** — `zodEnvValidator` to plug into `ConfigModule.forRoot({ validate })`.

## Boundary

`@orbit/common` is consumed by every app under `apps/*`. It must not depend on
any app or on `@orbit/contracts-*` — those depend on `common`, never the other
way around.
