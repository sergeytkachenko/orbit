import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Response } from 'express';
import { Observable, throwError } from 'rxjs';
import * as grpc from '@grpc/grpc-js';
import {
  ConflictError,
  DomainError,
  NotFoundError,
  UpstreamUnavailableError,
  ValidationError,
} from './domain.errors';

interface NormalisedError {
  http: number;
  rpc: number;
  message: string;
}

/**
 * Single exception filter for both apps and both transports. Translates
 * `DomainError` subclasses and `HttpException`s into:
 *   - HTTP responses with `{ statusCode, message, error }`
 *   - gRPC RpcException carrying the proper status code from @grpc/grpc-js
 *
 * Transport controllers stay free of error-translation logic; tests cover
 * both branches.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void | Observable<never> {
    const normalised = this.normalise(exception);
    if (normalised.http >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(normalised.message, exception instanceof Error ? exception.stack : undefined);
    }

    const type = host.getType<'http' | 'rpc'>();
    if (type === 'rpc') {
      // grpc-js's server expects an Error with a `code` field on it; that
      // value gets wired straight onto the wire as the gRPC status. Wrap
      // in an Observable error so Nest's RpcExceptionsHandler returns it.
      const rpcErr = Object.assign(new Error(normalised.message), {
        code: normalised.rpc,
        details: normalised.message,
      });
      return throwError(() => rpcErr);
    }

    const response = host.switchToHttp().getResponse<Response>();
    response.status(normalised.http).json({
      statusCode: normalised.http,
      message: normalised.message,
      error: HttpStatus[normalised.http] ?? 'Error',
    });
  }

  private normalise(exception: unknown): NormalisedError {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      const raw = typeof res === 'string' ? res : (res as { message?: unknown }).message;
      const message = Array.isArray(raw) ? raw.join('; ') : typeof raw === 'string' ? raw : exception.message;
      const http = exception.getStatus();
      return { http, rpc: httpToRpc(http), message };
    }
    if (exception instanceof RpcException) {
      const err = exception.getError();
      if (typeof err === 'object' && err !== null && 'code' in err) {
        const { code, message } = err as { code?: number; message?: string };
        const rpc = typeof code === 'number' ? code : grpc.status.UNKNOWN;
        return { http: rpcToHttp(rpc), rpc, message: message ?? exception.message };
      }
      return { http: 500, rpc: grpc.status.UNKNOWN, message: exception.message };
    }
    if (exception instanceof NotFoundError) {
      return { http: HttpStatus.NOT_FOUND, rpc: grpc.status.NOT_FOUND, message: exception.message };
    }
    if (exception instanceof ValidationError) {
      return { http: HttpStatus.BAD_REQUEST, rpc: grpc.status.INVALID_ARGUMENT, message: exception.message };
    }
    if (exception instanceof ConflictError) {
      return { http: HttpStatus.CONFLICT, rpc: grpc.status.ALREADY_EXISTS, message: exception.message };
    }
    if (exception instanceof UpstreamUnavailableError) {
      return {
        http: HttpStatus.GATEWAY_TIMEOUT,
        rpc: grpc.status.UNAVAILABLE,
        message: exception.message,
      };
    }
    if (exception instanceof DomainError) {
      return {
        http: HttpStatus.UNPROCESSABLE_ENTITY,
        rpc: grpc.status.FAILED_PRECONDITION,
        message: exception.message,
      };
    }
    const message = exception instanceof Error ? exception.message : 'Internal server error';
    return { http: HttpStatus.INTERNAL_SERVER_ERROR, rpc: grpc.status.INTERNAL, message };
  }
}

const httpToRpc = (status: number): number => {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return grpc.status.INVALID_ARGUMENT;
    case HttpStatus.UNAUTHORIZED:
      return grpc.status.UNAUTHENTICATED;
    case HttpStatus.FORBIDDEN:
      return grpc.status.PERMISSION_DENIED;
    case HttpStatus.NOT_FOUND:
      return grpc.status.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return grpc.status.ALREADY_EXISTS;
    case HttpStatus.GATEWAY_TIMEOUT:
      return grpc.status.UNAVAILABLE;
    case HttpStatus.UNPROCESSABLE_ENTITY:
      return grpc.status.FAILED_PRECONDITION;
    default:
      return status >= 500 ? grpc.status.INTERNAL : grpc.status.UNKNOWN;
  }
};

const rpcToHttp = (code: number): number => {
  switch (code) {
    case grpc.status.INVALID_ARGUMENT:
      return HttpStatus.BAD_REQUEST;
    case grpc.status.UNAUTHENTICATED:
      return HttpStatus.UNAUTHORIZED;
    case grpc.status.PERMISSION_DENIED:
      return HttpStatus.FORBIDDEN;
    case grpc.status.NOT_FOUND:
      return HttpStatus.NOT_FOUND;
    case grpc.status.ALREADY_EXISTS:
      return HttpStatus.CONFLICT;
    case grpc.status.UNAVAILABLE:
    case grpc.status.DEADLINE_EXCEEDED:
      return HttpStatus.GATEWAY_TIMEOUT;
    case grpc.status.FAILED_PRECONDITION:
      return HttpStatus.UNPROCESSABLE_ENTITY;
    default:
      return HttpStatus.INTERNAL_SERVER_ERROR;
  }
};
