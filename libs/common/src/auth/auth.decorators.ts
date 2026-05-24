import { SetMetadata } from '@nestjs/common';

/**
 * Metadata keys consulted by the global ApiKeyGuard. Apply via the
 * decorators below; the keys themselves are not part of the public API.
 */
export const PUBLIC_KEY = 'orbit:auth:public';
export const INTERNAL_ONLY_KEY = 'orbit:auth:internal-only';

/**
 * Mark a route handler (or whole controller) as not requiring auth.
 * Use for /health/*, /metrics, /docs, and explicitly public endpoints.
 */
export const Public = () => SetMetadata(PUBLIC_KEY, true);

/**
 * Mark a gRPC handler as internal-only. The guard then requires a
 * shared bearer token in gRPC metadata (`x-internal-token`). Used for
 * service-to-service calls; the network policy keeps these endpoints
 * off the public internet but the code does not rely on that.
 */
export const InternalOnly = () => SetMetadata(INTERNAL_ONLY_KEY, true);
