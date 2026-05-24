import { Global, Module } from '@nestjs/common';
import { IncomingMessage } from 'http';
import { randomUUID } from 'crypto';
import { LoggerModule, Params } from 'nestjs-pino';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

/**
 * Shared logging module — Pino-backed via `nestjs-pino`. Same provider is
 * imported by both apps so logger config drifts in one place.
 *
 * - Production (`NODE_ENV=production`): line-delimited JSON, ready for log
 *   aggregation.
 * - Dev / other: pretty-printed via `pino-pretty`.
 * - Log level: `LOG_LEVEL` env var (default `info`).
 * - Per-HTTP-request correlation id: accepts inbound `x-correlation-id`
 *   header, otherwise mints a UUID. Surfaced as `reqId` in every log line
 *   that's bound to the request scope, and re-emitted on the response.
 *
 * Correlation ids are propagated to gRPC calls by `IamClient` attaching the
 * id as gRPC metadata; the iam server's interceptor reads it back to bind
 * the request-scoped logger (see libs/transport-grpc/src/correlation.interceptor.ts).
 */
const buildPinoParams = (serviceName: string): Params => {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    pinoHttp: {
      name: serviceName,
      level: process.env.LOG_LEVEL ?? 'info',
      genReqId: (req: IncomingMessage) => {
        const headerVal = req.headers[CORRELATION_ID_HEADER];
        const incoming = Array.isArray(headerVal) ? headerVal[0] : headerVal;
        const id = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
        // Expose on the response so clients can correlate too.
        const res = (req as IncomingMessage & { res?: { setHeader?: (k: string, v: string) => void } }).res;
        res?.setHeader?.(CORRELATION_ID_HEADER, id);
        return id;
      },
      customProps: () => ({ service: serviceName }),
      transport: isProd
        ? undefined
        : {
            target: 'pino-pretty',
            options: { singleLine: true, translateTime: 'SYS:HH:MM:ss.l', colorize: true },
          },
      serializers: {
        req: (req: { id?: string; method?: string; url?: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
        }),
      },
    },
  };
};

@Global()
@Module({
  imports: [LoggerModule.forRoot(buildPinoParams(process.env.SERVICE_NAME ?? 'orbit'))],
  exports: [LoggerModule],
})
export class SharedLoggerModule {}
