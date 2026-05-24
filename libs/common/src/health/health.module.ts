import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { READINESS_PROBES } from './health.types';

/**
 * Shared HealthModule. Provides `GET /health/live` (always 200) and
 * `GET /health/ready` (aggregates injected ReadinessProbe providers; 503
 * if any probe fails).
 *
 * Services that need readiness probes should register their own provider
 * for `READINESS_PROBES` returning a `ReadinessProbe[]` — e.g. notify's
 * `IamUpstreamProbe`. See apps/notify/src/health/notify-health.module.ts.
 */
@Module({
  controllers: [HealthController],
  providers: [{ provide: READINESS_PROBES, useValue: [] }],
})
export class HealthModule {}
