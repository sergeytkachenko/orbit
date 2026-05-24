# Orbit Monorepo Constitution

This document is a mandatory set of principles for every service in this
monorepo. It describes how the monorepo is organized today and the
target state for scaling to 10+ services.

Rules are numbered. If an exception is needed, create an ADR in
`docs/adr/` that supersedes the relevant rule. No silent deviations.

Status notes (as of 2026-05-24):
- §2.4 (write-path events): event bus not yet wired. RPC is the only
  inter-service traffic today. Add when a third service needs to
  react to a domain event.
- §7 (persistence): both iam and notify use in-memory repositories.
  Replace with Postgres + per-service schemas + migrations when
  durability is required.

The remaining sections are in effect.

---

## 1. Repository structure

**1.1.** All executables live in `apps/<service>/`. Everything shared lives
in `libs/<lib>/`. No `app` imports directly from another `app`.

**1.2.** A service may have only these top-level directories: `src/`,
`test/`, `tsconfig.app.json`, and, if needed, static fixtures
(`*.json`, `*.sql`). Infrastructure files (`Dockerfile`, `compose`) live
at the repo root or in `install/`, not inside the service.

**1.3.** Every new service is created by following the runbook in
[`docs/ADDING_A_SERVICE.md`](ADDING_A_SERVICE.md). Ad-hoc copy-paste of
`apps/iam/` without working through the checklist is forbidden — the
runbook enumerates every cross-cutting file (`ServiceName` union, registry
config, `nest-cli.json`, `tsconfig.libs.json`, root `package.json`
scripts + jest paths) and the fail-fast verification commands that
catch a missed wire-up.

## 2. Contracts and transport

**2.1.** Each `.proto` file is the **single source of truth** for a
service's contract. No hand-written TS interfaces that duplicate the
`.proto`. TS types are generated (`pnpm proto:gen`); generated files are
committed so CI passes on a clean machine, but they are edited ONLY by
editing the `.proto`.

**2.2.** Contracts live in `libs/contracts/<service>/`. Runtime helpers
(client factory, server options, interceptors) live in
`libs/transport-grpc/`. They are not mixed.

**2.3.** Inter-service calls use **NestJS microservices patterns**
(`@MessagePattern`, `@EventPattern`, gRPC) — not HTTP fetch, not axios.
The transport is chosen by the platform; the call site stays type-safe
via the generated client.

**2.4.** Read path → synchronous RPC (gRPC). Write path → publishes an
event (`<entity>.<action>`, e.g. `user.created`). Consumer services
subscribe — they do not poll. This reduces coupling: one service going
down does not cascade through the system.

**2.5.** External SDKs (`@orbit/<service>-sdk` as an npm package) are
created only when an **external consumer** outside the monorepo appears.
For internal communication, internal contracts are enough.

## 3. Bootstrap and composition

**3.1.** No `main.ts` contains its own Nest configuration logic. All
services start through composable modules: `withHttp()`, `withGrpc()`,
`withSwagger()`, `withKafka()`, `withMetrics()`. A service includes only
what it needs (a worker without HTTP is a valid case).

**3.2.** Global concerns (logger, correlation ID, validation pipe,
exception filter, shutdown hooks) are wired once in the appropriate
`with*()` module. New global behavior is added there, not in every
`main.ts`.

**3.3.** Service discovery goes through `ServiceRegistry`, not through
`process.env.<NAME>_GRPC_URL`. The URL convention is fixed
(`{name}:{port}` in compose, `{name}.{ns}.svc.cluster.local:{port}` in
k8s); services ask `registry.url('iam')` instead of parsing env vars
themselves.

## 4. Cross-transport reuse

**4.1.** Business logic lives in `*.handler.ts` (Level-3). Controllers
(REST, gRPC, event consumer) are thin adapters that map transport input
into handler input and handler output into transport output.

**4.2.** One use case = one handler. If `POST /users` and
`IamService.CreateUser` need to diverge in behavior, create a second
handler — do not add an if-branch inside the existing one.

**4.3.** DTOs for REST and messages for gRPC may live side by side, but
they are **not used interchangeably**. Mapper functions (`toGrpcUser`,
`toUserResponse`) are a mandatory layer between transport and domain.

## 5. Observability

**5.1.** Every service **must** emit:
- structured logs (Pino, JSON in prod)
- distributed traces (OpenTelemetry, exporter configurable via env)
- Prometheus metrics on `/metrics`
- health endpoints on `/health/live` and `/health/ready`

This is not optional. A service without this is an incident waiting to
happen.

**5.2.** Correlation ID (`x-correlation-id`) propagates through ALL
transports — HTTP headers, gRPC metadata, Kafka headers.
AsyncLocalStorage carries it across async boundaries within a process.

**5.3.** Logs must contain `service`, `correlationId`, and `userId` (if
known). PII (email, phone, tokens) is NEVER logged; use `userId` for
debugging.

## 6. Configuration

**6.1.** All env vars are declared with a schema (`zod` / `Joi`) via
`@nestjs/config`. A service fails at startup if a required variable is
missing — not at runtime two hours later.

**6.2.** Secrets (DB passwords, API keys) are never committed. Locally
they live in `.env.local` (gitignored); in CI they come from a secrets
store; in prod they come from k8s Secret / Vault.

**6.3.** Defaults that work locally live in code (`?? 'localhost:5432'`).
Production values live only in external configuration. No `if (NODE_ENV
=== 'production')` branches with hardcoded URLs.

## 7. Persistence

**7.1.** One service = one database (or one schema in a shared cluster).
No service reads another service's table directly — only through the
owner's API.

**7.2.** Migrations live next to the service (`apps/<svc>/migrations/`)
and are applied by an explicit command (`pnpm --filter <svc> migrate`),
not automatically at startup in prod.

**7.3.** Database access goes through the repository pattern. ORM
entities are an internal implementation detail of the service — they are
not exported through contracts.

## 8. Testing

**8.1.** Every service has:
- unit tests on handlers and domain logic
- e2e tests on every transport it exposes (REST + gRPC)
- contract tests on every outbound call (mock the neighbor service from
  its `.proto` schema, not from free imagination)

**8.2.** Integration tests that depend on a DB/broker use **real
instances** (Testcontainers), not mocks. A mock DB that passes the test
but breaks in prod is the worst possible outcome.

**8.3.** No PR merges with a red CI. `--no-verify` is forbidden.

## 9. CI/CD

**9.1.** CI runs affected tests (tests only for the changed service plus
its dependents), not the full suite. At 10 services a full run is 20+
minutes, which kills velocity.

**9.2.** Each service has its own Docker image (multi-stage build with
`pnpm deploy --filter <svc>`). A shared "fat image" with a `SERVICE_NAME`
env is forbidden — it turns deploying one service into a risk for all of
them.

**9.3.** Service version = git SHA. We do not put semver on services —
they are internal artifacts, not libraries.

## 10. Documentation and decisions

**10.1.** Architectural decisions (new technology, contract change,
perf/cost trade-off, spike result, even "we decided NOT to do X") are
recorded as **ADRs** in `docs/adr/NNNN-title.md` in the Nygard format
(Status / Context / Decision / Consequences).

**10.2.** An ADR is never edited after it reaches Accepted. Changing a
decision = a new ADR with the status `Supersedes NNNN`.

**10.3.** Refactors, bugfixes, renames, dep bumps, content tweaks do
**not** need an ADR. When in doubt, do NOT write one.

**10.4.** Every service has `apps/<svc>/README.md` with:
- what the service does (one paragraph)
- which contracts it exposes
- which external dependencies it has (other services, DBs, brokers)
- how to run it locally

## 11. Security

**11.1.** No secrets in logs, git history, ADRs, or READMEs.

**11.2.** Every inbound endpoint (HTTP, gRPC) has explicit authorization
— either a `@Public()` decorator or an auth guard. Default is `deny`.

**11.3.** Internal-only endpoints (gRPC between services) are not
exposed to the outside network. That is infrastructure's responsibility
(k8s NetworkPolicy), but the code does not rely on it — auth is in
place regardless.

## 12. Changing this document

**12.1.** Changes to the constitution are filed as ADRs and require PR
review from at least two maintainers. This file is not a place for
unilateral edits.

**12.2.** If an existing service violates a rule of the constitution
that is **technical debt**, not an "exception". Either the service is
brought into compliance, or an ADR is written that supersedes the rule
with justification.
