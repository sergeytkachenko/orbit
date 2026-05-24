import { ValidationError } from '@orbit/common';
import { NotifyNotificationChannel } from '@orbit/contracts-notify';
import { NotificationChannel } from '../notification.entity';
import { channelFromWire } from './notification.mapper';

/**
 * LEVEL 2 — service-internal shared validators (notify).
 * Reused by the REST controller, the gRPC controller, and the Level-3
 * send-notification.handler.
 */

const SERVICE_CHANNELS = Object.values(NotificationChannel);
const WIRE_CHANNELS = Object.values(NotifyNotificationChannel).filter(
  (v) => v !== NotifyNotificationChannel.Unspecified,
);

export const assertValidUserId = (id: unknown): string => {
  if (typeof id !== 'string' || id.length === 0) {
    throw new ValidationError('userId must be a non-empty string');
  }
  return id;
};

/**
 * Accepts either the service-level lowercase form (`'email'` / `'sms'`,
 * as sent over REST) or the gRPC wire form (`'EMAIL'` / `'SMS'`),
 * normalising both to the internal `NotificationChannel` enum.
 */
export const assertValidChannel = (channel: unknown): NotificationChannel => {
  if (typeof channel === 'string' && SERVICE_CHANNELS.includes(channel as NotificationChannel)) {
    return channel as NotificationChannel;
  }
  const fromWire = typeof channel === 'string' ? channelFromWire(channel) : undefined;
  if (fromWire) return fromWire;
  throw new ValidationError(`channel must be one of: ${[...SERVICE_CHANNELS, ...WIRE_CHANNELS].join(', ')}`);
};

export const assertNonEmpty = (value: unknown, field: string): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new ValidationError(`${field} must be a non-empty string`);
  }
  return value;
};
