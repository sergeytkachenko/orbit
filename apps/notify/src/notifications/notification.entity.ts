export enum NotificationChannel {
  Email = 'email',
  Sms = 'sms',
}

export enum NotificationStatus {
  Pending = 'pending',
  Sent = 'sent',
}

export interface Notification {
  id: string;
  userId: string;
  channel: NotificationChannel;
  subject: string;
  body: string;
  status: NotificationStatus;
  recipient: { email: string; displayName: string };
  createdAt: string;
}
