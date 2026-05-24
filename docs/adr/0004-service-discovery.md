# 0004 — ServiceRegistry replaces per-service URL env vars

- Status: Accepted
- Date: 2026-05-24

## Context

Previously, every cross-service URL was a separate env var
(`IAM_GRPC_URL=iam:50051`). With two services this is a single env line
in compose; with ten services it becomes a 10×10 matrix that has to be
kept consistent across compose, every Helm chart, every test fixture,
and every README.

## Decision

Add `libs/service-registry` (`@orbit/service-registry`) with three
pieces:

- `ServiceRegistryConfig` — canonical map of `{ name → grpcPort,
  httpPort, namespace? }`. The default lives in `src/config.ts`. New
  services append an entry here (the `pnpm new:service` generator will
  do this automatically once it lands).
- `ServiceRegistry` — knows the current environment (`local`,
  `compose`, `k8s`) and resolves `grpcUrl(name)` / `httpUrl(name)` by
  applying the per-environment host convention:
    - `local` → `localhost:<port>`
    - `compose` → `<name>:<port>`
    - `k8s` → `<name>.<ns>.svc.cluster.local:<port>`
- `ServiceRegistryModule.forRoot()` — global Nest module that exposes
  the registry as an injectable provider.

The environment is selected by `ORBIT_ENV` (`local`, `compose`, `k8s`).
Defaults to `local`. Invalid values fail loudly at boot.

`notify`'s `NotificationsModule` now injects `ServiceRegistry` into its
gRPC client factory and calls `registry.grpcUrl('iam')` instead of
reading `IAM_GRPC_URL`. The compose file sets `ORBIT_ENV=compose` and
drops `IAM_GRPC_URL`.

A service's own listen ports stay env-driven (`IAM_HTTP_PORT`,
`NOTIFY_GRPC_PORT`) for operational override, but default to the
registry value. The registry is authoritative for cross-service URLs;
env stays authoritative for "what port this process binds to."

## Consequences

Positive:
- One place to look up a service's URL. Adding a service is one
  registry entry, not N envs across N consumers.
- Environment switch (local → compose → k8s) is a single env var, not
  N URL rewrites.
- Wrong service name fails at boot with a clear error
  (`service "xyz" is not registered (known: iam, notify)`) instead of
  a TCP timeout later.

Negative:
- The default registry was hand-edited at first. `pnpm new:service`
  now patches it automatically when scaffolding a new service.
- `local` resolves every service to `localhost`, which assumes only
  one process per port on the dev machine. Realistic for a local
  workstation; we accept it.

Neutral:
- A future `services.yml` file loader is easy to add (just pass an
  override config to `ServiceRegistryModule.forRoot({ config })`). We
  did not add a YAML loader yet because the in-code default suffices
  for two services.
