export type Environment = 'local' | 'compose' | 'k8s';

/**
 * Closed set of services known to this monorepo. Extend this union when
 * adding a new service; `DEFAULT_REGISTRY` is `satisfies`-checked against
 * it, so omitting a registration here is a compile error rather than a
 * runtime "service not registered" throw.
 */
export type ServiceName = 'iam' | 'notify';

export interface ServiceDescriptor {
  name: string;
  grpcPort: number;
  httpPort: number;
  /**
   * Optional k8s namespace override; defaults to the resolver's `namespace`.
   */
  namespace?: string;
}

export interface ServiceRegistryConfig<TName extends string = string> {
  /**
   * Default kubernetes namespace used when building DNS names. Per-service
   * `namespace` overrides this.
   */
  namespace: string;
  services: Record<TName, ServiceDescriptor>;
}
