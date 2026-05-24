# 0007 — Auth baseline: ApiKeyGuard + `@Public` / `@InternalOnly`

- Status: Accepted
- Date: 2026-05-24

## Context

Before this ADR every endpoint was open. Without any authorization
layer, the constitution's §11.2 ("default deny on every inbound
endpoint") was a goal, not a fact. We need a baseline that:

- defaults to deny so new endpoints inherit safety
- does not require a full identity system yet (no user accounts, no
  OIDC provider)
- supports two concrete cases: a public-ish HTTP API and
  service-to-service gRPC

## Decision

Add `libs/common/src/auth/` with:

- `ApiKeyGuard` — a global `CanActivate` that checks
  `x-api-key: ${ORBIT_API_KEY}` for HTTP and `x-internal-token:
  ${ORBIT_INTERNAL_TOKEN}` in gRPC metadata for handlers marked
  `@InternalOnly()`.
- `@Public()` — exempts a route/controller from the API key check.
- `@InternalOnly()` — flags a gRPC handler/controller as
  service-to-service; the guard requires the internal token.

Wired globally inside `ServiceBuilder.run()` so every service inherits
the same behavior without per-app code.

Failure modes:
- HTTP: missing or wrong key → 401.
- gRPC `@InternalOnly`: missing or wrong token → 401 (translated by
  Nest's gRPC filter into `UNAUTHENTICATED`).
- HTTP without `@Public` or `@InternalOnly` in non-production with the
  env unset → allowed (developer ergonomics; tests pass).
- HTTP/internal in production with the env unset → 401 ("not
  configured"). Fail closed.

Current decorator placement:
- `HealthController` → `@Public()` — k8s probes can't authenticate.
- `UsersController`, `NotificationsController` → `@Public()` with a
  TODO. Until a real auth flow exists, these are effectively open in
  prod too; the marker makes the gap explicit.
- `UsersGrpcController`, `NotificationsGrpcController` →
  `@InternalOnly()` — these are the cross-service surfaces, locked to
  the shared token.

## Consequences

Positive:
- New endpoints get auth for free (default deny via the global guard).
- The two transport surfaces have explicit, separate access models.
- Tests work in non-prod without env setup; prod refuses to serve
  without it.

Negative:
- Shared static tokens are weak. Token rotation requires restarting
  every consumer. Acceptable as a baseline; the real solution is
  JWT/OIDC.
- The `@Public()` on `UsersController` /
  `NotificationsController` makes prod effectively open. The TODO
  comments and this ADR make that visible — it must be removed when
  the identity flow lands.
- The internal token, if leaked, lets an attacker call any gRPC
  endpoint. NetworkPolicy (k8s) should ensure these ports are not
  externally reachable in any case.

Neutral:
- The guard is intentionally simple — under 100 lines. When the real
  auth lands it will be replaced wholesale rather than extended.
