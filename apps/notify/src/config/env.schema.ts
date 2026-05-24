import { z } from 'zod';

/**
 * Env schema for notify. See iam's schema for the rationale (fail at
 * boot instead of two hours later).
 */
export const NotifyEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    ORBIT_ENV: z.enum(['local', 'compose', 'k8s']).default('local'),

    NOTIFY_HTTP_PORT: z.coerce.number().int().positive().optional(),
    NOTIFY_GRPC_PORT: z.coerce.number().int().positive().optional(),

    IAM_GRPC_TIMEOUT_MS: z.coerce.number().int().positive().optional(),

    OTEL_ENABLED: z.string().optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: z.string().url().optional(),
    OTEL_SERVICE_VERSION: z.string().optional(),
  })
  .passthrough();

export type NotifyEnv = z.infer<typeof NotifyEnvSchema>;
