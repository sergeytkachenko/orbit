# 0001 — Use NestJS microservices patterns over gRPC for inter-service calls

- Status: Accepted
- Date: 2026-05-24

## Context

`notify` needs to call `iam` (to resolve a user before sending a
notification) and we expect more cross-service calls as services
multiply. The options considered were:

1. Plain HTTP between services, hand-written `axios` clients per call
   site.
2. Per-service npm SDK packages (`@orbit/iam-sdk`, published).
3. NestJS microservices patterns (`@MessagePattern`, gRPC transport)
   with shared `.proto` contracts inside the monorepo.

Option 1 is fast to start but degrades quickly: every consumer writes
its own retry/timeout/error-translation logic, and contracts drift
because there is no schema.

Option 2 is the right answer when contracts must be shared across
repositories or organizations, but introduces npm publishing,
versioning, and changelog overhead that is pure cost while all
consumers live in the same monorepo.

Option 3 gives type-safe, schema-first contracts (.proto), a uniform
client surface (`ClientGrpc` / generated interfaces), pluggable
transports without changing call sites, and built-in metadata
propagation (correlation IDs, future auth tokens).

## Decision

Use NestJS microservices patterns with gRPC transport for all
inter-service synchronous calls. `.proto` files are the canonical
contract. Generated TS types are consumed both by the server
(`@GrpcMethod` controllers) and the client (`ClientGrpc.getService`).

We do not publish per-service npm SDKs. If an external consumer ever
appears, that consumer's SDK can be generated from the same `.proto`.

## Consequences

Positive:
- One contract surface per service, type-checked on both ends.
- Transport is swappable (gRPC today; could become NATS for events,
  Kafka for streaming) without rewriting call sites.
- Metadata (correlation IDs, auth) propagates through every call by
  construction.
- No npm publishing pipeline to maintain.

Negative:
- Both ends must speak NestJS (or at least gRPC + the generated client
  code). For a polyglot system this would be a problem; for an
  all-Nest backend it is not.
- Latency on RPC-over-broker is higher than direct HTTP, but we are
  using direct gRPC, so this does not apply.

Neutral:
- Async (event) traffic gets a separate decision (§2.4 of the
  constitution). Today everything is RPC; an event bus arrives when a
  third service needs to react to `user.created`.
