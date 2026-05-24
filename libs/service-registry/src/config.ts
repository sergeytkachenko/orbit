import { ServiceName, ServiceRegistryConfig } from './types';

/**
 * Default registry shipped with the monorepo. Each new service registers
 * itself here as part of its initial PR; see `docs/ADDING_A_SERVICE.md`
 * for the full checklist (this file is step 2 of 9).
 *
 * URL conventions per environment:
 *   - local   → `localhost:<port>` (developer workstation, services on
 *               loopback)
 *   - compose → `<name>:<port>` (docker-compose service DNS)
 *   - k8s     → `<name>.<namespace>.svc.cluster.local:<port>`
 *
 * Per-service overrides live in `services` — `port` is canonical, the
 * host is derived from the environment + service name.
 */
export const DEFAULT_REGISTRY: ServiceRegistryConfig<ServiceName> = {
  namespace: 'orbit',
  services: {
    iam: { name: 'iam', grpcPort: 50051, httpPort: 3001 },
    notify: { name: 'notify', grpcPort: 50052, httpPort: 3002 },
  },
};
