import { httpRequestDurationSeconds, httpRequestsTotal } from './metrics-registry';

/**
 * Express middleware that records duration + a counter for every
 * inbound HTTP response. We collapse status into 2xx/3xx/4xx/5xx for
 * cardinality safety; the raw code lives in logs/traces.
 *
 * `route` falls back to `req.path` when Express has not matched a
 * route yet (e.g. for /metrics or unmatched paths). For paths with
 * UUIDs this would blow up cardinality — Nest with @Controller routes
 * sets `req.route.path` to the template (e.g. `/users/:id`), which is
 * what we want.
 */
export function httpMetricsMiddleware(
  req: { method: string; route?: { path?: string }; path: string },
  res: { on: (event: string, cb: () => void) => void; statusCode: number },
  next: () => void,
): void {
  const end = httpRequestDurationSeconds.startTimer();
  res.on('finish', () => {
    const route = req.route?.path ?? req.path;
    const status = `${Math.floor(res.statusCode / 100)}xx`;
    httpRequestsTotal.inc({ method: req.method, route, status });
    end({ method: req.method, route, status });
  });
  next();
}
