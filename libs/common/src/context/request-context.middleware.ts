import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { CORRELATION_ID_HEADER } from '../logging/logger.module';
import { requestContext } from './request-context';

/**
 * Reads `x-correlation-id` from the inbound HTTP request (mints one if
 * absent), echoes it on the response, and enters `requestContext` so any
 * downstream code (services, gRPC clients) can pull the value via
 * `getCurrentCorrelationId()`.
 *
 * Mirrors what nestjs-pino's `genReqId` already does for logging — having
 * a single AsyncLocalStorage source lets non-logging consumers (e.g. the
 * IamClient propagating the id as gRPC metadata) read it without coupling
 * to the logger.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const raw = req.headers[CORRELATION_ID_HEADER];
    const incoming = Array.isArray(raw) ? raw[0] : raw;
    const correlationId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    requestContext.run({ correlationId }, () => next());
  }
}
