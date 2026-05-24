import { Injectable } from '@nestjs/common';
import { NotifyNotification } from '@orbit/contracts-notify';
import { NotificationV2Response } from '../dto/notification.response';
import { toGrpcNotification, toNotificationV2Response } from '../shared/notification.mapper';
import { assertNonEmpty, assertValidChannel, assertValidUserId } from '../shared/notification.validators';
import { NotificationsService } from '../notifications.service';

export interface SendNotificationInput {
  userId: unknown;
  channel: unknown;
  subject: unknown;
  body: unknown;
}

/**
 * LEVEL 3 — one-API shared component (notify side).
 *
 * `POST /notifications` (REST) and `NotifyService.SendNotification` (gRPC)
 * both run through the same validate-and-persist pipeline. The transport
 * controllers only choose the output mapper.
 */
@Injectable()
export class SendNotificationHandler {
  constructor(private readonly notifications: NotificationsService) {}

  async asRest(input: SendNotificationInput): Promise<NotificationV2Response> {
    const n = await this.run(input);
    return toNotificationV2Response(n);
  }

  async asGrpc(input: SendNotificationInput): Promise<NotifyNotification> {
    const n = await this.run(input);
    return toGrpcNotification(n);
  }

  private async run(input: SendNotificationInput) {
    const userId = assertValidUserId(input.userId);
    const channel = assertValidChannel(input.channel);
    const subject = assertNonEmpty(input.subject, 'subject');
    const body = assertNonEmpty(input.body, 'body');
    return this.notifications.create({ userId, channel, subject, body });
  }
}
