# Architecture Decision Records

Each file captures one non-trivial architectural choice — what we
considered, what we picked, and what we accept as the cost. ADRs are
written once and not edited in place; supersede an old decision by
adding a new ADR that references it.

| # | Decision |
| --- | --- |
| [0001](0001-nestjs-microservices-grpc.md) | Use NestJS microservices patterns over gRPC for inter-service calls |
| [0002](0002-cross-transport-handlers.md) | Cross-transport handlers (Level-3 pattern: `asRest`/`asGrpc`) |
| [0003](0003-correlation-id-propagation.md) | Correlation ID propagation via AsyncLocalStorage and gRPC metadata |
| [0004](0004-service-discovery.md) | `ServiceRegistry` replaces per-service URL env vars |
| [0005](0005-bootstrap-composition.md) | Composable bootstrap via `ServiceBuilder` + `with*()` modules |
| [0006](0006-distributed-tracing.md) | OpenTelemetry tracing via SDK + OTLP exporter, Jaeger locally |
| [0007](0007-auth-baseline.md) | Auth baseline: `ApiKeyGuard` + `@Public` / `@InternalOnly` |
| [0008](0008-tsc-libs-single-dockerfile.md) | tsc-built libs, single root Dockerfile, runtime resolution via `dist/` |
