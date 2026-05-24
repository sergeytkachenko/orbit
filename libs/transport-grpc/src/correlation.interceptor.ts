import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Metadata } from '@grpc/grpc-js';
import { Observable } from 'rxjs';
import { randomUUID } from 'crypto';
import { CORRELATION_ID_HEADER, requestContext, type RequestContextStore } from '@orbit/common';

/**
 * gRPC server interceptor: reads `x-correlation-id` metadata, mints one if
 * missing, then runs the rest of the handler chain inside the request
 * context so loggers / downstream calls see the same id.
 *
 * Used by `bootstrapService` for every connected microservice.
 */
@Injectable()
export class GrpcCorrelationInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (ctx.getType() !== 'rpc') return next.handle();

    const md = ctx.switchToRpc().getContext<Metadata>();
    const values = md?.get(CORRELATION_ID_HEADER) ?? [];
    const headerVal = values[0];
    const correlationId =
      typeof headerVal === 'string' && headerVal.length > 0
        ? headerVal
        : headerVal instanceof Buffer
          ? headerVal.toString('utf8')
          : randomUUID();

    const store: RequestContextStore = { correlationId };
    return new Observable((subscriber) => {
      requestContext.run(store, () => {
        next.handle().subscribe({
          next: (v) => subscriber.next(v),
          error: (e) => subscriber.error(e),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
