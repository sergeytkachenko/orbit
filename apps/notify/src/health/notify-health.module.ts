import { Module } from '@nestjs/common';
import { HealthController } from '@orbit/common';
import { READINESS_PROBES } from '@orbit/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { IamUpstreamProbe } from './iam-upstream.probe';

/**
 * Notify-specific wiring of the shared HealthController: pulls in
 * `NotificationsModule` so the `IamClient` is reachable, then registers
 * `IamUpstreamProbe` as the one readiness check.
 */
@Module({
  imports: [NotificationsModule],
  controllers: [HealthController],
  providers: [
    IamUpstreamProbe,
    {
      provide: READINESS_PROBES,
      useFactory: (probe: IamUpstreamProbe) => [probe],
      inject: [IamUpstreamProbe],
    },
  ],
})
export class NotifyHealthModule {}
