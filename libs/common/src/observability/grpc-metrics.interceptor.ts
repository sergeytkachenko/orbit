import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { grpcCallDurationSeconds, grpcCallsTotal } from './metrics-registry';

/**
 * Records duration + count for every inbound gRPC method. We only
 * apply this for the `rpc` context — HTTP requests are handled by
 * `httpMetricsMiddleware`. `method` is `Service.method`, derived from
 * the Nest handler's class and method name (these match the proto
 * service definition by convention).
 */
@Injectable()
export class GrpcMetricsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'rpc') return next.handle();
    const className = context.getClass().name;
    const methodName = context.getHandler().name;
    const method = `${className}.${methodName}`;
    const end = grpcCallDurationSeconds.startTimer();
    return next.handle().pipe(
      tap({
        next: () => {
          grpcCallsTotal.inc({ method, status: 'OK' });
          end({ method, status: 'OK' });
        },
        error: (err) => {
          const status =
            typeof (err as { code?: number | string }).code !== 'undefined'
              ? String((err as { code?: number | string }).code)
              : 'UNKNOWN';
          grpcCallsTotal.inc({ method, status });
          end({ method, status });
        },
      }),
    );
  }
}
