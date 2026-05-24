import { ClientProviderOptions, Transport } from '@nestjs/microservices';

/**
 * Factory for `ClientsModule.register([...])` providers. Produces a
 * `ClientProviderOptions` with:
 *   - the same loader config used by the server side (see
 *     grpc-server.options.ts) so marshalling stays in lockstep,
 *   - keepalive defaults that prevent idle TCP connections from being
 *     silently dropped by NATs / proxies / load balancers.
 */
export const buildGrpcClientOptions = (params: {
  name: string;
  packageName: string;
  protoPath: string;
  url: string;
}): ClientProviderOptions => ({
  name: params.name,
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
      // Send a keepalive ping every 30s when the connection is otherwise idle.
      'grpc.keepalive_time_ms': 30_000,
      // Fail if no ack within 10s.
      'grpc.keepalive_timeout_ms': 10_000,
      // Allow keepalives even when there are no active calls.
      'grpc.keepalive_permit_without_calls': 1,
      // Bump the default min ping interval the server tolerates from clients.
      'grpc.http2.min_time_between_pings_ms': 10_000,
      'grpc.http2.max_pings_without_data': 0,
    },
  },
});
