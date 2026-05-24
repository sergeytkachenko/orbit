import { Injectable, Logger } from '@nestjs/common';
import { getCurrentCorrelationId, requestContext } from '@orbit/common';
import { Notification, NotificationStatus } from './notification.entity';
import { notificationsDispatchedTotal } from './notification-metrics';
import { NotificationsRepository } from './notifications.repository';

const MIN_DELAY_MS = 100;
const MAX_DELAY_MS = 2000;

/**
 * Emulates an async delivery pipeline (e.g. SMTP / SMS provider). On
 * dispatch we log `dispatching…` synchronously, then after a randomised
 * 100–2000ms delay we log `delivered to …` and flip the persisted
 * status from `pending` → `sent`.
 *
 * Today the "transport" is just a setTimeout, but the contract here
 * matches what a real worker would look like: status is updated by the
 * dispatcher, not the caller — so swapping in a BullMQ/Kafka consumer
 * later is a one-file change.
 *
 * The deferred log line is re-entered into the original request's
 * AsyncLocalStorage so it carries the same `reqId` as the synchronous
 * line — useful when tracing a single client request across services.
 */
@Injectable()
export class NotificationDispatcher {
  private readonly logger = new Logger(NotificationDispatcher.name);

  constructor(private readonly repo: NotificationsRepository) {}

  dispatch(notification: Notification): void {
    const correlationId = getCurrentCorrelationId();
    const delayMs = randomDelay();
    this.logger.log(
      `dispatching id=${notification.id} channel=${notification.channel} to=${notification.recipient.email} in=${delayMs}ms`,
    );
    notificationsDispatchedTotal.inc({ channel: notification.channel, status: 'dispatched' });

    const deliver = async (): Promise<void> => {
      try {
        const updated = await this.repo.updateStatus(notification.id, NotificationStatus.Sent);
        if (!updated) {
          this.logger.warn(`delivery noop: notification ${notification.id} disappeared before send`);
          return;
        }
        this.logger.log(
          `delivered id=${notification.id} channel=${notification.channel} to=${notification.recipient.email}`,
        );
        notificationsDispatchedTotal.inc({ channel: notification.channel, status: 'delivered' });
      } catch (err) {
        this.logger.error(
          `delivery failed for ${notification.id}: ${err instanceof Error ? err.message : err}`,
        );
        notificationsDispatchedTotal.inc({ channel: notification.channel, status: 'failed' });
      }
    };

    const timer = setTimeout(() => {
      if (correlationId) {
        requestContext.run({ correlationId }, () => {
          void deliver();
        });
      } else {
        void deliver();
      }
    }, delayMs);
    // Don't keep the event loop alive solely for pending dispatches —
    // graceful shutdown should not be blocked by emulated traffic.
    timer.unref();
  }
}

const randomDelay = (): number =>
  MIN_DELAY_MS + Math.floor(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS + 1));
