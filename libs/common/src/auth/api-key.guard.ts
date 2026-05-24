import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { INTERNAL_ONLY_KEY, PUBLIC_KEY } from './auth.decorators';

/**
 * Baseline auth guard. Default for every endpoint is DENY:
 *   - HTTP endpoints: require `x-api-key: ${ORBIT_API_KEY}`. Skipped if
 *     the route or controller has `@Public()`.
 *   - gRPC endpoints marked `@InternalOnly()`: require
 *     `x-internal-token: ${ORBIT_INTERNAL_TOKEN}` in gRPC metadata.
 *
 * If either env is unset in non-production environments, the
 * corresponding check is skipped — so local development and tests
 * don't require token wiring. Set the envs in compose/prod.
 *
 * This is a baseline, not a full identity system. Replace with proper
 * JWT/OIDC when there is a user-facing auth flow.
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const type = context.getType();
    if (type === 'rpc') return this.checkInternal(context);
    return this.checkApiKey(context);
  }

  private checkApiKey(context: ExecutionContext): boolean {
    const expected = process.env.ORBIT_API_KEY;
    if (!expected && process.env.NODE_ENV !== 'production') return true;
    if (!expected) {
      // Fail closed in prod: refuse to serve if the key isn't configured.
      throw new UnauthorizedException('api key not configured');
    }
    const req = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | string[] | undefined> }>();
    const header = req.headers['x-api-key'];
    const presented = Array.isArray(header) ? header[0] : header;
    if (presented !== expected) {
      throw new UnauthorizedException('invalid or missing api key');
    }
    return true;
  }

  private checkInternal(context: ExecutionContext): boolean {
    const internalOnly = this.reflector.getAllAndOverride<boolean>(INTERNAL_ONLY_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!internalOnly) return true; // gRPC method without @InternalOnly() is allowed

    const expected = process.env.ORBIT_INTERNAL_TOKEN;
    if (!expected && process.env.NODE_ENV !== 'production') return true;
    if (!expected) {
      throw new UnauthorizedException('internal token not configured');
    }
    // gRPC: metadata is the 2nd arg; switchToRpc().getContext() returns it.
    const md = context.switchToRpc().getContext<{ get: (key: string) => unknown[] }>();
    const values = md?.get?.('x-internal-token') ?? [];
    const presented = Array.isArray(values) && values.length > 0 ? String(values[0]) : undefined;
    if (presented !== expected) {
      throw new UnauthorizedException('invalid or missing internal token');
    }
    return true;
  }
}
