import { collectDefaultMetrics, Counter, Histogram, Registry } from 'prom-client';

/**
 * Single Prometheus registry per process. We expose it both as a default
 * (auto-instrumented by `withMetrics`) and as a target for custom metrics
 * declared by services — see `dispatcher.ts` for an example.
 */
export const metricsRegistry = new Registry();

let defaultsRegistered = false;
export function ensureDefaultMetrics(): void {
  if (defaultsRegistered) return;
  collectDefaultMetrics({ register: metricsRegistry });
  defaultsRegistered = true;
}

// ---- RED metrics ---------------------------------------------------------
// Rate / Errors / Duration on inbound HTTP and inbound gRPC. Common labels:
//   - `method` (e.g. 'GET', 'POST', or a gRPC method name)
//   - `route` (URL template for HTTP, service.method for gRPC)
//   - `status` ('2xx', '4xx', '5xx', or gRPC status code as string)

export const httpRequestDurationSeconds = new Histogram({
  name: 'http_server_duration_seconds',
  help: 'HTTP server request duration in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

export const httpRequestsTotal = new Counter({
  name: 'http_server_requests_total',
  help: 'Total HTTP server requests',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [metricsRegistry],
});

export const grpcCallDurationSeconds = new Histogram({
  name: 'grpc_server_duration_seconds',
  help: 'gRPC server call duration in seconds',
  labelNames: ['method', 'status'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [metricsRegistry],
});

export const grpcCallsTotal = new Counter({
  name: 'grpc_server_calls_total',
  help: 'Total gRPC server calls',
  labelNames: ['method', 'status'] as const,
  registers: [metricsRegistry],
});
