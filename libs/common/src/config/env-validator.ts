import type { ZodType, ZodSafeParseResult } from 'zod';

/**
 * Adapter for `ConfigModule.forRoot({ validate })`. Pass a zod schema;
 * any validation failure throws with a readable, multi-issue message so
 * the service crashes at boot — not three calls into a handler.
 *
 * Usage in app.module.ts:
 *   ConfigModule.forRoot({
 *     isGlobal: true,
 *     validate: zodEnvValidator(EnvSchema),
 *   })
 */
export function zodEnvValidator<T extends ZodType>(
  schema: T,
): (env: Record<string, unknown>) => Record<string, unknown> {
  return (env) => {
    const result = schema.safeParse(env) as ZodSafeParseResult<unknown>;
    if (!result.success) {
      const issues = result.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
      throw new Error(`invalid environment:\n${issues}`);
    }
    return result.data as Record<string, unknown>;
  };
}
