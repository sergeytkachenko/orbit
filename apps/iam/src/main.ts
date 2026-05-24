// IMPORTANT: tracing must start before any other import so http / grpc /
// express get instrumented at require time. Controlled by OTEL_ENABLED.
import { startTracing } from '@orbit/common';
startTracing('iam');

import { bootstrapService } from '@orbit/common';
import { withGrpc } from '@orbit/transport-grpc';
import { IAM_PACKAGE, IAM_PROTO_PATH } from '@orbit/contracts-iam';
import { DEFAULT_REGISTRY } from '@orbit/service-registry';
import { AppModule } from './app.module';

const iam = DEFAULT_REGISTRY.services.iam;
const httpPort = Number(process.env.IAM_HTTP_PORT ?? iam.httpPort);
const grpcPort = Number(process.env.IAM_GRPC_PORT ?? iam.grpcPort);

bootstrapService({
  AppModule,
  serviceName: 'iam',
  httpPort,
  swagger: {
    title: 'Orbit iam',
    description: 'Identity & access REST API.',
  },
  extras: [withGrpc({ packageName: IAM_PACKAGE, protoPath: IAM_PROTO_PATH, port: grpcPort })],
});
