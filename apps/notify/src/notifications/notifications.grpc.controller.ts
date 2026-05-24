import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { InternalOnly } from '@orbit/common';
import { NOTIFY_SERVICE_NAME, NotifyNotification, SendNotificationRequest } from '@orbit/contracts-notify';
import { SendNotificationHandler } from './api/send-notification.handler';

@InternalOnly()
@Controller()
export class NotificationsGrpcController {
  constructor(private readonly sendNotification: SendNotificationHandler) {}

  @GrpcMethod(NOTIFY_SERVICE_NAME, 'SendNotification')
  async sendNotificationRpc(request: SendNotificationRequest): Promise<NotifyNotification> {
    return this.sendNotification.asGrpc(request);
  }
}
