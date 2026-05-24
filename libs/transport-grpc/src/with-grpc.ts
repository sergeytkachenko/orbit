import { INestApplication } from '@nestjs/common';
import { Logger as PinoLogger } from 'nestjs-pino';
import { buildGrpcServerOptions } from './grpc-server.options';
import { GrpcCorrelationInterceptor } from './correlation.interceptor';

export interface WithGrpcOptions {
  packageName: string;
  protoPath: string;
  port: number;
  /** Bind host; defaults to all interfaces. */
  host?: string;
}

/**
 * Bootstrap configurator that attaches a gRPC microservice and the
 * inbound correlation-id interceptor. Compatible with `ServiceBuilder`
 * from `@orbit/common`: pass it via `bootstrapService({ extras: [...] })`
 * or `.with(...)` directly.
 */
export const withGrpc =
  (opts: WithGrpcOptions) =>
  (app: INestApplication): void => {
    app.useGlobalInterceptors(new GrpcCorrelationInterceptor());
    app.connectMicroservice(
      buildGrpcServerOptions({
        packageName: opts.packageName,
        protoPath: opts.protoPath,
        url: `${opts.host ?? '0.0.0.0'}:${opts.port}`,
      }),
      { inheritAppConfig: true },
    );
    app.get(PinoLogger).log(`gRPC ready on :${opts.port}`, 'Bootstrap');
  };
