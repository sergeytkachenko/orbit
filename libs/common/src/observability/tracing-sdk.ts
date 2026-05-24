/*
 * OpenTelemetry SDK bootstrap. Must be imported BEFORE any module that
 * should be instrumented (so http / grpc / express are patched at require
 * time). Each service's main.ts imports this file as the very first line:
 *
 *   import { startTracing } from '@orbit/common/observability/tracing-sdk';
 *   startTracing('iam');
 *   import { bootstrapService } from '@orbit/common';
 *   ...
 *
 * Env knobs:
 *   OTEL_ENABLED         — '1' / 'true' to enable (default: off)
 *   OTEL_EXPORTER_OTLP_ENDPOINT — collector URL (default: http://localhost:4318/v1/traces)
 *   OTEL_SERVICE_VERSION — service version, surfaced as resource attr
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

let sdk: NodeSDK | undefined;

export function isTracingActive(): boolean {
  return sdk !== undefined;
}

export function startTracing(serviceName: string): void {
  const enabled = ['1', 'true', 'yes'].includes((process.env.OTEL_ENABLED ?? '').toLowerCase());
  if (!enabled || sdk) return;

  const exporter = new OTLPTraceExporter({
    url:
      process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
      `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4318'}/v1/traces`,
  });

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: process.env.OTEL_SERVICE_VERSION ?? 'dev',
    }),
    traceExporter: exporter,
    // Auto-instruments http, grpc, express, nestjs, pino, and more.
    // We disable fs since it produces extreme noise for negligible value.
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();

  const shutdown = async () => {
    try {
      await sdk?.shutdown();
    } catch (err) {
      // Logger may already be closed; fall back to stderr.
      process.stderr.write(`tracing shutdown failed: ${String(err)}\n`);
    }
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
