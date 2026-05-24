/*
 * Re-exports of generated notify.proto types. Source of truth:
 * `protos/notify.proto`; regenerate via `pnpm proto:gen`.
 *
 * PascalCase enum aliases (`Email`, `Pending`) preserve the original
 * ergonomic API on top of the generated SCREAMING_SNAKE enum members.
 */
import { Observable } from 'rxjs';
import {
  Notification as GeneratedNotification,
  NotificationChannel,
  NotificationStatus,
  Recipient as GeneratedRecipient,
  SendNotificationRequest as GeneratedSendNotificationRequest,
} from './generated/notify';

export const NotifyNotificationChannel = {
  Unspecified: NotificationChannel.NOTIFICATION_CHANNEL_UNSPECIFIED,
  Email: NotificationChannel.EMAIL,
  Sms: NotificationChannel.SMS,
} as const;
export type NotifyNotificationChannel =
  (typeof NotifyNotificationChannel)[keyof typeof NotifyNotificationChannel];

export const NotifyNotificationStatus = {
  Unspecified: NotificationStatus.NOTIFICATION_STATUS_UNSPECIFIED,
  Pending: NotificationStatus.PENDING,
  Sent: NotificationStatus.SENT,
} as const;
export type NotifyNotificationStatus =
  (typeof NotifyNotificationStatus)[keyof typeof NotifyNotificationStatus];

export type NotifyRecipient = GeneratedRecipient;
export type NotifyNotification = GeneratedNotification;
export type SendNotificationRequest = GeneratedSendNotificationRequest;

export { NotificationChannel, NotificationStatus };

export interface NotifyServiceClient {
  sendNotification(request: SendNotificationRequest): Observable<NotifyNotification>;
}
