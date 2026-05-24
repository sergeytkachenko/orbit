import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { Metadata, status as GrpcStatus } from '@grpc/grpc-js';
import { firstValueFrom, TimeoutError } from 'rxjs';
import { timeout } from 'rxjs/operators';
import {
  CORRELATION_ID_HEADER,
  getCurrentCorrelationId,
  NotFoundError,
  UpstreamUnavailableError,
  ValidationError,
} from '@orbit/common';
import { IAM_SERVICE_NAME, IamServiceClient, IamUser } from '@orbit/contracts-iam';

export const IAM_CLIENT = 'IAM_CLIENT';

const DEFAULT_TIMEOUT_MS = 5000;

/**
 * Thin typed wrapper around the gRPC ClientGrpc handle. Hides the rxjs
 * Observable shape from the rest of the notify codebase so call sites
 * read as plain async code, and centralises:
 *   - per-call deadline (env `IAM_GRPC_TIMEOUT_MS`, default 5s)
 *   - gRPC status code → domain error translation (NotFound, Validation,
 *     UpstreamUnavailable for timeouts/UNAVAILABLE/DEADLINE_EXCEEDED)
 *   - optional gRPC metadata pass-through (correlation IDs, future auth)
 */
@Injectable()
export class IamClient implements OnModuleInit {
  private readonly logger = new Logger(IamClient.name);
  private readonly timeoutMs = Number(process.env.IAM_GRPC_TIMEOUT_MS ?? DEFAULT_TIMEOUT_MS);
  private service!: IamServiceClient;

  constructor(@Inject(IAM_CLIENT) private readonly grpc: ClientGrpc) {}

  onModuleInit(): void {
    this.service = this.grpc.getService<IamServiceClient>(IAM_SERVICE_NAME);
  }

  async getUser(id: string, metadata?: Metadata): Promise<IamUser> {
    const md = this.withCorrelation(metadata);
    try {
      return await firstValueFrom(this.service.getUser({ id }, md).pipe(timeout({ each: this.timeoutMs })));
    } catch (err) {
      throw this.translate(err, 'getUser');
    }
  }

  private withCorrelation(metadata?: Metadata): Metadata {
    const md = metadata ?? new Metadata();
    if (md.get(CORRELATION_ID_HEADER).length === 0) {
      const id = getCurrentCorrelationId();
      if (id) md.add(CORRELATION_ID_HEADER, id);
    }
    // iam's gRPC surface is @InternalOnly — attach the shared internal
    // token when one is configured. Local/test runs without the env
    // skip this; iam's guard skips the check in the same situation.
    const internalToken = process.env.ORBIT_INTERNAL_TOKEN;
    if (internalToken && md.get('x-internal-token').length === 0) {
      md.add('x-internal-token', internalToken);
    }
    return md;
  }

  private translate(err: unknown, op: string): Error {
    if (err instanceof TimeoutError) {
      this.logger.warn(`iam.${op} timed out after ${this.timeoutMs}ms`);
      return new UpstreamUnavailableError(`iam.${op} timed out after ${this.timeoutMs}ms`);
    }
    const code = (err as { code?: number })?.code;
    const message =
      (err as { details?: string; message?: string })?.details ??
      (err as { message?: string })?.message ??
      String(err);

    if (code === GrpcStatus.NOT_FOUND) return new NotFoundError(message);
    if (code === GrpcStatus.INVALID_ARGUMENT) return new ValidationError(message);
    if (code === GrpcStatus.UNAVAILABLE || code === GrpcStatus.DEADLINE_EXCEEDED) {
      return new UpstreamUnavailableError(`iam unavailable: ${message}`);
    }
    // Other gRPC errors surface as upstream failures rather than 500s.
    return new UpstreamUnavailableError(`iam.${op} failed: ${message}`);
  }
}
