import { Controller, Get, HttpCode, HttpStatus, Inject, Optional, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../auth/auth.decorators';
import { ReadinessProbe, READINESS_PROBES } from './health.types';

interface ProbeResult {
  name: string;
  ok: boolean;
  detail?: string;
}

@ApiTags('health')
@Public()
@Controller({ path: 'health' })
export class HealthController {
  constructor(@Optional() @Inject(READINESS_PROBES) private readonly probes: ReadinessProbe[] = []) {}

  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe — process is up' })
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe — process and all dependencies are healthy' })
  async ready(@Res() res: Response): Promise<void> {
    const results: ProbeResult[] = await Promise.all(
      (this.probes ?? []).map(async (p) => {
        try {
          const r = await p.check();
          return { name: p.name, ok: r.ok, detail: r.detail };
        } catch (err) {
          return { name: p.name, ok: false, detail: err instanceof Error ? err.message : 'unknown' };
        }
      }),
    );
    const ok = results.every((r) => r.ok);
    res.status(ok ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status: ok ? 'ok' : 'unhealthy',
      checks: results,
    });
  }
}
