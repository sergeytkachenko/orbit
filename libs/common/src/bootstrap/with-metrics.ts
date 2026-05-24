import { Logger as PinoLogger } from 'nestjs-pino';
import { GrpcMetricsInterceptor } from '../observability/grpc-metrics.interceptor';
import { httpMetricsMiddleware } from '../observability/http-metrics.middleware';
import { ensureDefaultMetrics, metricsRegistry } from '../observability/metrics-registry';
import { Configurator } from './types';

export interface WithMetricsOptions {
  /** Override scrape path. Defaults to `/metrics`. */
  path?: string;
}

/**
 * Wires Prometheus metrics:
 *   - registers process/runtime default collectors
 *   - mounts the express middleware that records HTTP RED metrics
 *   - installs the gRPC RED interceptor globally
 *   - exposes the scrape endpoint at `/metrics`
 *
 * `prom-client` is process-global by design, so calling this twice in
 * one process is safe but pointless.
 */
export const withMetrics =
  (opts: WithMetricsOptions = {}): Configurator =>
  (app) => {
    ensureDefaultMetrics();
    app.use(httpMetricsMiddleware);
    app.useGlobalInterceptors(new GrpcMetricsInterceptor());

    const path = opts.path ?? '/metrics';
    // Bypass Nest's controller layer for two reasons:
    //  1. We don't want /metrics to go through the global ValidationPipe.
    //  2. The middleware fires before route handlers, so /metrics shouldn't
    //     be metered itself (it would skew counts on every scrape).
    const http = app.getHttpAdapter().getInstance();
    http.get(
      path,
      async (
        _req: unknown,
        res: { setHeader: (k: string, v: string) => void; send: (body: string) => void },
      ) => {
        res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        res.send(await metricsRegistry.metrics());
      },
    );

    app.get(PinoLogger).log(`metrics endpoint mounted at ${path}`, 'Bootstrap');
  };
