import { Injectable } from '@nestjs/common';
import { NotFoundError } from '@orbit/common';
import { IamClient } from '../clients/iam.client';
import { NotificationDispatcher } from './dispatcher';
import { Notification, NotificationChannel } from './notification.entity';
import { NotificationsRepository } from './notifications.repository';

export interface CreateNotificationInput {
  userId: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly repo: NotificationsRepository,
    private readonly iam: IamClient,
    private readonly dispatcher: NotificationDispatcher,
  ) {}

  /**
   * Service-to-service gRPC happens here. Every notification call goes
   * through iam.GetUser to resolve recipient info — that lookup is the
   * mandatory cross-service gRPC interaction the brief requires.
   *
   * Persists the notification as `pending` and kicks off the async
   * dispatcher; the HTTP/gRPC response returns immediately while
   * "delivery" runs in the background.
   */
  async create(input: CreateNotificationInput): Promise<Notification> {
    const user = await this.iam.getUser(input.userId);
    const notification = await this.repo.create({
      userId: user.id,
      channel: input.channel,
      subject: input.subject,
      body: input.body,
      recipient: { email: user.email, displayName: user.displayName },
    });
    this.dispatcher.dispatch(notification);
    return notification;
  }

  async findAll(): Promise<Notification[]> {
    return this.repo.findAll();
  }

  async findById(id: string): Promise<Notification> {
    const n = await this.repo.findById(id);
    if (!n) throw new NotFoundError(`Notification ${id} not found`);
    return n;
  }
}
