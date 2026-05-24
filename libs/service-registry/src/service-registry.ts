import { DEFAULT_REGISTRY } from './config';
import { Environment, ServiceName, ServiceRegistryConfig } from './types';

const ENVS: ReadonlySet<Environment> = new Set(['local', 'compose', 'k8s']);

/**
 * Resolves service URLs from a single registry instead of from per-call
 * `process.env.<NAME>_GRPC_URL` variables.
 *
 * Construct once in the composition root (a module provider), then inject
 * wherever a service needs to talk to another service. The environment
 * is fixed at construction; in tests, pass a custom config to swap hosts
 * (e.g. for an ephemeral test container).
 */
export class ServiceRegistry<TName extends string = ServiceName> {
  constructor(
    private readonly env: Environment,
    private readonly config: ServiceRegistryConfig<TName> = DEFAULT_REGISTRY as ServiceRegistryConfig<TName>,
  ) {}

  static fromEnv(): ServiceRegistry<ServiceName> {
    const raw = process.env.ORBIT_ENV ?? 'local';
    if (!ENVS.has(raw as Environment)) {
      throw new Error(`ORBIT_ENV must be one of ${[...ENVS].join(', ')}; got "${raw}"`);
    }
    return new ServiceRegistry(raw as Environment);
  }

  /**
   * URL for the named service's gRPC port. Throws if the service is not
   * registered — fail loudly at boot rather than dial a bogus host later.
   *
   * Env override: `<NAME>_GRPC_PORT` (e.g. `IAM_GRPC_PORT=5000`) wins
   * over the registered default, so the same env var that drives the
   * service's own bind port also drives every resolver pointing at it.
   */
  grpcUrl(name: TName): string {
    const svc = this.requireService(name);
    return `${this.host(svc.name, svc.namespace)}:${this.portOverride(name, 'GRPC') ?? svc.grpcPort}`;
  }

  /**
   * URL for the named service's HTTP port (use for upstream probes or
   * service-to-service REST when gRPC is not available).
   *
   * Env override: `<NAME>_HTTP_PORT` wins over the registered default
   * (same convention as gRPC).
   */
  httpUrl(name: TName): string {
    const svc = this.requireService(name);
    return `http://${this.host(svc.name, svc.namespace)}:${this.portOverride(name, 'HTTP') ?? svc.httpPort}`;
  }

  private portOverride(name: TName, kind: 'HTTP' | 'GRPC'): number | undefined {
    const key = `${name.toUpperCase().replace(/-/g, '_')}_${kind}_PORT`;
    const raw = process.env[key];
    if (!raw) return undefined;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }

  private host(name: string, namespace?: string): string {
    switch (this.env) {
      case 'local':
        return 'localhost';
      case 'compose':
        return name;
      case 'k8s':
        return `${name}.${namespace ?? this.config.namespace}.svc.cluster.local`;
    }
  }

  private requireService(name: TName) {
    const svc = this.config.services[name];
    if (!svc) {
      const known = Object.keys(this.config.services).join(', ');
      throw new Error(`service "${name}" is not registered (known: ${known})`);
    }
    return svc;
  }
}
