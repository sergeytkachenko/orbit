import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { buildGrpcClientOptions } from '@orbit/transport-grpc';
import { IAM_PACKAGE, IAM_PROTO_PATH } from '@orbit/contracts-iam';
import { ServiceRegistry } from '@orbit/service-registry';
import { IAM_CLIENT, IamClient } from '../clients/iam.client';
import { SendNotificationHandler } from './api/send-notification.handler';
import { NotificationDispatcher } from './dispatcher';
import { NotificationsController } from './notifications.controller';
import { NotificationsGrpcController } from './notifications.grpc.controller';
import { InMemoryNotificationsRepository, NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: IAM_CLIENT,
        inject: [ServiceRegistry],
        useFactory: (registry: ServiceRegistry) =>
          buildGrpcClientOptions({
            name: IAM_CLIENT,
            packageName: IAM_PACKAGE,
            protoPath: IAM_PROTO_PATH,
            url: registry.grpcUrl('iam'),
          }),
      },
    ]),
  ],
  controllers: [NotificationsController, NotificationsGrpcController],
  providers: [
    NotificationsService,
    SendNotificationHandler,
    NotificationDispatcher,
    IamClient,
    { provide: NotificationsRepository, useClass: InMemoryNotificationsRepository },
  ],
  exports: [IamClient],
})
export class NotificationsModule {}
