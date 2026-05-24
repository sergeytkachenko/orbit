import { Injectable, Logger } from '@nestjs/common';
import { NotFoundError, ReadinessProbe, UpstreamUnavailableError } from '@orbit/common';
import { IamClient } from '../clients/iam.client';

/**
 * Readiness probe for the notify service: probes the iam gRPC server with
 * a lookup for a sentinel id. A NotFoundError counts as "iam is alive and
 * answering" — a timeout / connection failure becomes a probe failure.
 */
@Injectable()
export class IamUpstreamProbe implements ReadinessProbe {
  readonly name = 'iam-grpc';
  private readonly logger = new Logger(IamUpstreamProbe.name);

  constructor(private readonly iam: IamClient) {}

  async check(): Promise<{ ok: boolean; detail?: string }> {
    try {
      await this.iam.getUser('__healthcheck__');
      return { ok: true };
    } catch (err) {
      if (err instanceof NotFoundError) return { ok: true, detail: 'iam reachable' };
      if (err instanceof UpstreamUnavailableError) {
        return { ok: false, detail: err.message };
      }
      this.logger.warn(`iam readiness probe error: ${err instanceof Error ? err.message : String(err)}`);
      return { ok: false, detail: err instanceof Error ? err.message : 'unknown' };
    }
  }
}
