import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextStore {
  correlationId: string;
}

/**
 * Process-wide AsyncLocalStorage for per-request data. Today it carries the
 * correlation id; future cross-cutting context (auth principal, tenant)
 * can extend `RequestContextStore` without touching call sites.
 *
 * Enter the store with `requestContext.run(store, () => …)` — anything
 * `await`-ed inside that callback sees the store via `requestContext.getStore()`.
 */
export const requestContext = new AsyncLocalStorage<RequestContextStore>();

export const getCurrentCorrelationId = (): string | undefined => requestContext.getStore()?.correlationId;
