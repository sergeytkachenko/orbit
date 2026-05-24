# 0006 — OpenTelemetry tracing via SDK + OTLP exporter, Jaeger locally

- Status: Accepted
- Date: 2026-05-24

## Context

With two services the correlation ID (ADR 0003) is enough to follow a
request across processes by grepping logs. At ten services that
strategy breaks down: nested cross-service calls produce N×N grep
patterns, latency attribution becomes guesswork, and the team cannot
answer "where did the 800 ms go?" without instrumented spans.

The constitution §5.1 mandates distributed tracing for every service.
We need a solution that:

- starts before Nest is imported (auto-instrumentations patch
  `http`, `grpc`, `express` at require time)
- has a no-op mode for unit and e2e tests (don't emit spans to a
  non-existent collector)
- works with a local collector (developer ergonomics) and a remote
  one (prod)

## Decision

Use `@opentelemetry/sdk-node` with `getNodeAutoInstrumentations()`,
exporting via OTLP HTTP (`@opentelemetry/exporter-trace-otlp-http`)
to Jaeger's all-in-one container (which speaks native OTLP) locally.

Bootstrap pattern:

- `libs/common/src/observability/tracing-sdk.ts` exports
  `startTracing(serviceName)`. It is a no-op unless `OTEL_ENABLED` is
  truthy.
- Each service's `main.ts` calls `startTracing(serviceName)` as the
  **very first** import. This ensures auto-instrumentations can patch
  Node's `http` and `@grpc/grpc-js` before either is required.
- The `withTracing()` configurator (see ADR 0005) logs whether
  tracing is active during bootstrap, so the startup line confirms
  instrumentation state.

Compose adds a `jaeger` service (`jaegertracing/all-in-one:1.76.0` with
`COLLECTOR_OTLP_ENABLED=true`) and points both services'
`OTEL_EXPORTER_OTLP_ENDPOINT` at `http://jaeger:4318`. The Jaeger UI
is reachable inside the compose network at `http://jaeger:16686`;
add `ports: ["16686:16686"]` under the jaeger service to access it
from the host. In production, services point at the cluster's OTel
collector via env.

Default-off in dev keeps unit tests fast and doesn't try to dial a
collector that isn't there. Compose flips it on by setting
`OTEL_ENABLED=1`.

The `fs` auto-instrumentation is disabled — it is extremely noisy and
adds no diagnostic value for our workloads.

## Consequences

Positive:
- Spans for HTTP server, HTTP client, gRPC server, gRPC client,
  Express, and (optionally) Nest interceptors come for free.
- Correlation ID (ADR 0003) stays as the human-readable handle; trace
  ID is the machine-readable one. Both are useful — log lines remain
  greppable, traces give visual structure.
- Production-ready exporter; the `OTEL_EXPORTER_OTLP_ENDPOINT` env is
  the standard knob k8s deployments use, no per-service wiring needed.

Negative:
- Two-step start (`startTracing` then `bootstrapService`). Easy to get
  wrong (put tracing call below other imports → silently no spans).
  The new-service generator template puts the calls in the right order.
- Auto-instrumentation overhead is non-trivial (~5-10% in CPU-bound
  paths); fine in dev/prod with `OTEL_ENABLED=1`, off by default in
  tests.
- Compose now requires the Jaeger image. ~150 MB; acceptable.

Neutral:
- Sampling is left at the SDK default (always-on) since traffic is
  internal and low. A production deployment will want a head-based or
  tail-based sampler — that's a separate ADR when it matters.
