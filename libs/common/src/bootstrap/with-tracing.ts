import { Logger as PinoLogger } from 'nestjs-pino';
import { isTracingActive } from '../observability/tracing-sdk';
import { Configurator } from './types';

/**
 * Confirms in startup logs whether OpenTelemetry was activated for this
 * process. The actual SDK has to start BEFORE Nest is imported (so
 * http / grpc / express get patched at require time), so the real
 * `startTracing(serviceName)` call lives at the very top of each
 * service's `main.ts`. This configurator only reports the state so the
 * builder pipeline remains uniform.
 */
export const withTracing = (): Configurator => (app) => {
  const status = isTracingActive() ? 'on' : 'off';
  app.get(PinoLogger).log(`OpenTelemetry tracing: ${status}`, 'Bootstrap');
};
