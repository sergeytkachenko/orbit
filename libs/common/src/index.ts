// Versioning — public decorator + constants/extractor consumed by e2e tests.
export { ApiVersion } from './versioning/api-version.decorator';
export { API_VERSION_HEADER, DEFAULT_API_VERSION } from './versioning/versioning.constants';
export { headerVersionExtractor } from './versioning/header-version.extractor';

// Errors — domain error subclasses + global filter.
export {
  NotFoundError,
  ValidationError,
  ConflictError,
  UpstreamUnavailableError,
} from './errors/domain.errors';
export { AllExceptionsFilter } from './errors/all-exceptions.filter';

// Health — shared controller, module, probe registry + contract.
export { HealthController } from './health/health.controller';
export { HealthModule } from './health/health.module';
export { READINESS_PROBES, type ReadinessProbe } from './health/health.types';

// Request context — async-local store accessor, helper, store shape.
export { requestContext, getCurrentCorrelationId, type RequestContextStore } from './context/request-context';

// Logging — Nest module + correlation header constant.
export { SharedLoggerModule, CORRELATION_ID_HEADER } from './logging/logger.module';

// Config — env schema validator for use with `ConfigModule.forRoot({validate})`.
export { zodEnvValidator } from './config/env-validator';

// Auth — baseline API key + internal-token guard with @Public / @InternalOnly decorators.
export { ApiKeyGuard, Public, InternalOnly } from './auth';

// Observability — call startTracing(serviceName) as the very first line
// of main.ts so http/grpc/express get instrumented at require time.
export { startTracing, isTracingActive } from './observability/tracing-sdk';
// Shared Prometheus registry — register service-specific metrics against it.
export { metricsRegistry } from './observability/metrics-registry';

// Service bootstrap — composable ServiceBuilder + facade.
// Transport-specific configurators (e.g. withGrpc) live in their
// own libs (@orbit/transport-grpc) and are passed via cfg.extras.
export { bootstrapService } from './bootstrap';
export {
  ServiceBuilder,
  withHttp,
  withSwagger,
  withMetrics,
  withTracing,
  type Configurator,
  type ServiceBuilderInit,
  type WithHttpOptions,
  type WithSwaggerOptions,
} from './bootstrap/index';
