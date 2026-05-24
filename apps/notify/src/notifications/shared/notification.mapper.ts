import {
  NotifyNotification,
  NotifyNotificationChannel,
  NotifyNotificationStatus,
} from '@orbit/contracts-notify';
import { Notification, NotificationChannel, NotificationStatus } from '../notification.entity';
import { NotificationV1Response, NotificationV2Response } from '../dto/notification.response';

/**
 * LEVEL 2 — service-internal shared mappers (notify).
 *
 * Bridges the service-level enums (lowercase: `'email'`, `'pending'`) and
 * the wire-format proto enums (SCREAMING_SNAKE_CASE: `'EMAIL'`,
 * `'PENDING'`). Keeping the translation in one place means consumers can
 * keep using the ergonomic lowercase values everywhere except at the
 * gRPC boundary.
 */

const CHANNEL_TO_WIRE: Record<NotificationChannel, NotifyNotificationChannel> = {
  [NotificationChannel.Email]: NotifyNotificationChannel.Email,
  [NotificationChannel.Sms]: NotifyNotificationChannel.Sms,
};

const CHANNEL_FROM_WIRE: Record<NotifyNotificationChannel, NotificationChannel | undefined> = {
  [NotifyNotificationChannel.Unspecified]: undefined,
  [NotifyNotificationChannel.Email]: NotificationChannel.Email,
  [NotifyNotificationChannel.Sms]: NotificationChannel.Sms,
};

const STATUS_TO_WIRE: Record<NotificationStatus, NotifyNotificationStatus> = {
  [NotificationStatus.Pending]: NotifyNotificationStatus.Pending,
  [NotificationStatus.Sent]: NotifyNotificationStatus.Sent,
};

export const channelToWire = (c: NotificationChannel): NotifyNotificationChannel => CHANNEL_TO_WIRE[c];

export const channelFromWire = (c: NotifyNotificationChannel | string): NotificationChannel | undefined =>
  CHANNEL_FROM_WIRE[c as NotifyNotificationChannel];

export const statusToWire = (s: NotificationStatus): NotifyNotificationStatus => STATUS_TO_WIRE[s];

export const toNotificationV1Response = (n: Notification): NotificationV1Response => ({
  id: n.id,
  userId: n.userId,
  status: n.status,
});

export const toNotificationV2Response = (n: Notification): NotificationV2Response => ({
  id: n.id,
  userId: n.userId,
  channel: n.channel,
  subject: n.subject,
  body: n.body,
  status: n.status,
  recipient: { ...n.recipient },
  createdAt: n.createdAt,
});

export const toGrpcNotification = (n: Notification): NotifyNotification => ({
  id: n.id,
  userId: n.userId,
  channel: channelToWire(n.channel),
  subject: n.subject,
  body: n.body,
  status: statusToWire(n.status),
  recipient: { ...n.recipient },
  createdAt: n.createdAt,
});
