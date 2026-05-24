import { z } from 'zod';

/**
 * Env schema for iam. Optional vars get sensible defaults; required vars
 * with no default cause `app` to fail at boot. New env vars must be
 * added here so the failure mode is "service refuses to start" rather
 * than "service starts and later misbehaves".
 */
export const IamEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    ORBIT_ENV: z.enum(['local', 'compose', 'k8s']).default('local'),

    IAM_HTTP_PORT: z.coerce.number().int().positive().optional(),
    IAM_GRPC_PORT: z.coerce.number().int().positive().optional(),
    DEMO_USERS_PATH: z.string().optional(),

    OTEL_ENABLED: z.string().optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: z.string().url().optional(),
    OTEL_SERVICE_VERSION: z.string().optional(),
  })
  // Don't drop unknown vars — Node + Docker inject many, and a strict()
  // schema would reject all of them. `passthrough` keeps the rest as-is.
  .passthrough();

export type IamEnv = z.infer<typeof IamEnvSchema>;
