# @orbit/transport-grpc

gRPC transport wiring shared by every service. Keeps server and client sides
in lockstep so marshalling rules and keepalive tolerances never drift.

## Responsibility

- **`buildGrpcServerOptions({ packageName, protoPath, url })`** — `GrpcOptions`
  for `app.connectMicroservice(...)`. Standard proto loader config and
  keepalive channel options.
- **`buildGrpcClientOptions({ name, packageName, protoPath, url })`** —
  matching `ClientProviderOptions` for `ClientsModule.register([...])`. Uses
  the same loader config as the server so request/response marshalling stays
  consistent.
- **`GrpcCorrelationInterceptor`** — server-side interceptor that reads
  `x-correlation-id` from gRPC metadata (mints one if missing) and runs the
  handler inside `@orbit/common`'s request context so logs and downstream
  calls inherit the id.

## Why a dedicated lib

Keepalive defaults must match on both sides (otherwise idle connections get
`ENHANCE_YOUR_CALM` / `GOAWAY`); proto loader options must match (otherwise
field casing and enum encoding diverge). Centralizing both halves here makes
it a single edit instead of N service-local edits.

## Boundary

Consumed by `@orbit/common` (bootstrap composes `withGrpc` around these) and
by service composition roots that register gRPC clients. Depends on
`@orbit/common` only for the correlation-id header constant + request context.
