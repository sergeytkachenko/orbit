# 0002 — Cross-transport handlers (Level-3 pattern)

- Status: Accepted
- Date: 2026-05-24

## Context

Both `iam` and `notify` expose the same use cases over two transports:
REST (`POST /users`, `POST /notifications`) and gRPC
(`IamService.CreateUser`, `NotifyService.SendNotification`). Naive
implementations duplicate validation, persistence, and error
translation between the two controllers, then drift.

We considered:

1. Duplicating logic in each controller (rejected: drift guaranteed).
2. A "service" layer where controllers call the service. Works, but
   gives no clear seam between business logic and transport mapping —
   controllers tend to leak DTO/proto shapes into the service.
3. A dedicated **handler** that owns the use case and exposes
   transport-shaped methods (`asRest()`, `asGrpc()`). Controllers
   become thin adapters that only call the appropriate method and
   return the result.

## Decision

Every use case is implemented as a `*Handler` class with one private
`run()` method and one public method per transport (`asRest`, `asGrpc`,
later `asEvent` if needed). Controllers (REST and gRPC) inject the
handler and contain no business logic — only input mapping (from
transport DTO/proto to handler input) and output mapping (via dedicated
mapper functions).

Example: `CreateUserHandler.asRest(dto)` returns a `UserResponse`;
`CreateUserHandler.asGrpc(req)` returns a proto `User`. Both go through
the same `run()`.

## Consequences

Positive:
- One use case = one code path. Validation, persistence, side effects
  are written and tested once.
- Adding a third transport (event consumer, GraphQL) is a new method on
  the handler — no rewrite.
- Easy to unit-test: the handler is plain TypeScript with injected
  dependencies; no HTTP/gRPC plumbing in the test.

Negative:
- Two transport-shaped methods on every handler is mild ceremony for
  use cases that have only one transport. We accept this; the cost is
  one extra method signature.
- Tempting to put "shared logic between handlers" inside one of them.
  Resist; that goes in a domain service.

Neutral:
- Mapper functions (`toGrpcUser`, `toUserResponse`) are a mandatory
  layer, not optional. The constitution §4.3 enforces this.
