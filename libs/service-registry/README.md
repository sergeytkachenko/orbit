# @orbit/service-registry

Single source of truth for resolving where another service lives. Replaces
ad-hoc `process.env.<NAME>_GRPC_URL` lookups scattered across services.

## Responsibility

- Hold the registry of known services (name, gRPC port, HTTP port, optional k8s
  namespace) in `ServiceRegistryConfig`.
- Resolve hosts per environment (`ORBIT_ENV` ∈ `local` | `compose` | `k8s`):
  - `local` → `localhost`
  - `compose` → `<service-name>` (docker-compose DNS)
  - `k8s` → `<name>.<namespace>.svc.cluster.local`
- Expose `grpcUrl(name)` / `httpUrl(name)` and fail loudly at boot if a service
  is unknown — no silent dials to bogus hosts.
- Provide `ServiceRegistryModule.forRoot()`, a `@Global()` Nest module so any
  provider can `@Inject(ServiceRegistry)` without re-importing.

## When to use

Anywhere a service needs the address of another service (gRPC client wiring,
readiness probes hitting an upstream, etc.). Construct once in the composition
root; in tests, pass a custom `ServiceRegistryConfig` to point at ephemeral
containers.
