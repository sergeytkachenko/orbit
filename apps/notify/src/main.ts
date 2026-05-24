// IMPORTANT: tracing must start before any other import so http / grpc /
// express get instrumented at require time. Controlled by OTEL_ENABLED.
import { startTracing } from '@orbit/common';
startTracing('notify');

import { bootstrapService } from '@orbit/common';
import { withGrpc } from '@orbit/transport-grpc';
import { NOTIFY_PACKAGE, NOTIFY_PROTO_PATH } from '@orbit/contracts-notify';
import { DEFAULT_REGISTRY } from '@orbit/service-registry';
import { AppModule } from './app.module';

const notify = DEFAULT_REGISTRY.services.notify;
const httpPort = Number(process.env.NOTIFY_HTTP_PORT ?? notify.httpPort);
const grpcPort = Number(process.env.NOTIFY_GRPC_PORT ?? notify.grpcPort);

bootstrapService({
  AppModule,
  serviceName: 'notify',
  httpPort,
  swagger: {
    title: 'Orbit notify',
    description: 'Notifications REST API. Internally calls iam.GetUser over gRPC.',
  },
  extras: [withGrpc({ packageName: NOTIFY_PACKAGE, protoPath: NOTIFY_PROTO_PATH, port: grpcPort })],
});
