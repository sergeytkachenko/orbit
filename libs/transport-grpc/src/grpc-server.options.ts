import { Transport, GrpcOptions } from '@nestjs/microservices';

/**
 * Builds the GrpcOptions used by `app.connectMicroservice(...)` so each
 * service spins up its gRPC server with identical defaults (proto loader
 * config, keepalive tolerances, message sizes). Keeps wiring DRY across
 * services.
 */
export const buildGrpcServerOptions = (params: {
  packageName: string;
  protoPath: string;
  url: string;
}): GrpcOptions => ({
  transport: Transport.GRPC,
  options: {
    package: params.packageName,
    protoPath: params.protoPath,
    url: params.url,
    loader: {
      keepCase: false,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true,
    },
    channelOptions: {
      // Match the client side (see grpc-client.factory.ts) so client
      // keepalives are not rejected with ENHANCE_YOUR_CALM / GOAWAY.
      'grpc.keepalive_time_ms': 30_000,
      'grpc.keepalive_timeout_ms': 10_000,
      'grpc.keepalive_permit_without_calls': 1,
      'grpc.http2.min_ping_interval_without_data_ms': 10_000,
      'grpc.http2.max_pings_without_data': 0,
    },
  },
});
