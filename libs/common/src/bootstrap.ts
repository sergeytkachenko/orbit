import { INestApplication, Type } from '@nestjs/common';
import { ServiceBuilder } from './bootstrap/service-builder';
import { Configurator } from './bootstrap/types';
import { withHttp } from './bootstrap/with-http';
import { withMetrics } from './bootstrap/with-metrics';
import { withSwagger } from './bootstrap/with-swagger';
import { withTracing } from './bootstrap/with-tracing';

export interface BootstrapConfig {
  AppModule: Type<unknown>;
  /** Used in logs + the Swagger banner. */
  serviceName: string;
  httpPort: number;
  swagger: { title: string; description: string };
  /**
   * Transport-specific configurators applied before HTTP. Pass
   * `withGrpc(...)` from `@orbit/transport-grpc` for services that
   * expose a gRPC microservice.
   */
  extras?: Configurator[];
}

/**
 * Backward-compatible facade over `ServiceBuilder`. Wires the
 * standard set of always-on configurators (Swagger, metrics, tracing,
 * HTTP) plus any transport-specific extras provided by the caller.
 *
 * New services that need a different shape should compose
 * `ServiceBuilder` directly with whichever `with*` modules they need.
 */
export async function bootstrapService(cfg: BootstrapConfig): Promise<INestApplication> {
  const builder = new ServiceBuilder({ AppModule: cfg.AppModule, serviceName: cfg.serviceName });
  for (const extra of cfg.extras ?? []) builder.with(extra);
  return builder
    .with(withSwagger({ title: cfg.swagger.title, description: cfg.swagger.description }))
    .with(withMetrics())
    .with(withTracing())
    .with(withHttp({ port: cfg.httpPort }))
    .run();
}
