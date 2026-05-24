# 0003 — Correlation ID propagation via AsyncLocalStorage and gRPC metadata

- Status: Accepted
- Date: 2026-05-24

## Context

Debugging a request that crosses `notify → iam` is intractable without
a stable identifier that ties together log lines across both processes.
The standard solution is a correlation ID injected at the edge and
propagated everywhere.

Constraints:

- The ID must reach **every** log line emitted while handling the
  request, including lines from async work (`setTimeout`, promises)
  that has lost the original call stack.
- It must cross process boundaries (HTTP → gRPC → HTTP → log
  aggregator).
- It must not require every function to take an extra `correlationId`
  argument.

We considered:

1. Passing the ID as a function argument through every layer. Rejected:
   pollutes every signature and is easy to forget.
2. A request-scoped DI provider. Works in Nest, but does not survive
   `setTimeout`/queue handoffs without manual re-entry.
3. **AsyncLocalStorage** at the edge, with the ID auto-attached by the
   Pino logger and explicitly re-entered for deferred work
   (`requestContext.run(...)`).

## Decision

Use AsyncLocalStorage (`libs/common/src/context/request-context.ts`) to
store the correlation ID for the lifetime of a request.

Propagation rules:

- **HTTP inbound:** `RequestContextMiddleware` reads
  `x-correlation-id` (or generates one) and enters the store.
- **gRPC inbound:** `GrpcCorrelationInterceptor` reads the
  `x-correlation-id` metadata key and enters the store.
- **gRPC outbound:** the gRPC client (`IamClient`) attaches the current
  store value as metadata before calling.
- **Logger:** Pino reads the store on each log call and injects the ID
  as a structured field.
- **Async re-entry:** code that hands work off to `setTimeout` /
  workers must wrap the deferred callback in `requestContext.run(...)`
  to restore the ID. The dispatcher in `notify` already does this.

## Consequences

Positive:
- Every log line carries `correlationId` automatically. Tracing a
  single request across services is a single grep.
- Function signatures stay clean.
- Works for both HTTP and gRPC without per-transport logger setup.

Negative:
- AsyncLocalStorage has a small per-context overhead; negligible at
  our scale.
- Async handoffs that **forget** to re-enter the context will silently
  drop the ID. The pattern is in `dispatcher.ts` and must be copied
  for every new background task. A lint rule could enforce this; we
  have not added one yet.

Neutral:
- Pairs with distributed tracing (OpenTelemetry, ADR 0006): the
  correlation ID stays as the human-readable handle alongside the
  machine-generated trace ID.
