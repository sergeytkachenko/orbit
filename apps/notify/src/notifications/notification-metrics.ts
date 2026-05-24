import { Counter } from 'prom-client';
import { metricsRegistry } from '@orbit/common';

/**
 * Number of dispatched notifications, partitioned by channel and final
 * delivery status. `status` is `dispatched` at send time and flips to
 * `delivered` or `failed` from the dispatcher.
 */
export const notificationsDispatchedTotal = new Counter({
  name: 'notifications_dispatched_total',
  help: 'Notifications dispatched (one per attempt)',
  labelNames: ['channel', 'status'] as const,
  registers: [metricsRegistry],
});
