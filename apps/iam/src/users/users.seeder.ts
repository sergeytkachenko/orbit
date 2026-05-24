import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { existsSync, readFileSync } from 'fs';
import { isAbsolute, resolve } from 'path';
import { User } from './user.entity';
import { UsersRepository } from './users.repository';

const DEFAULT_PATHS = [
  // Compiled (node dist/apps/iam/src/main.js): walk up to repo root.
  resolve(__dirname, '..', '..', '..', '..', 'apps', 'iam', 'demousers.json'),
  // Dev (ts-node from repo root):
  resolve(process.cwd(), 'apps', 'iam', 'demousers.json'),
  // Local file in app dir (Docker entry, when running from /app):
  resolve(process.cwd(), 'demousers.json'),
];

/**
 * On boot, seeds the in-memory users repository from a JSON fixture
 * when the repo is empty. Skipped after the first run so data added at
 * runtime is preserved across pure restarts (e.g. `nest start --watch`).
 *
 * Fixture path resolution order:
 *   1. `DEMO_USERS_PATH` env var (absolute or relative to CWD)
 *   2. compiled location (`dist/.../apps/iam/demousers.json`)
 *   3. repo-root dev location
 *   4. `/app/demousers.json` (Docker bind-mount target)
 *
 * If no readable file is found, the seeder logs a warning and exits — it
 * never throws, so an unseeded run is still functional.
 */
@Injectable()
export class UsersSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersSeeder.name);

  constructor(private readonly users: UsersRepository) {}

  async onApplicationBootstrap(): Promise<void> {
    if ((await this.users.count()) > 0) {
      this.logger.log('Users repo non-empty, skipping demo seed');
      return;
    }

    const path = this.resolveFixturePath();
    if (!path) {
      this.logger.warn(
        'No demousers.json found (set DEMO_USERS_PATH to opt in). Starting with an empty users repo.',
      );
      return;
    }

    try {
      const raw = readFileSync(path, 'utf8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        this.logger.warn(`Demo fixture at ${path} is not a JSON array; skipping seed.`);
        return;
      }
      const valid = parsed.filter(isUser);
      if (valid.length !== parsed.length) {
        this.logger.warn(
          `Demo fixture at ${path}: skipped ${parsed.length - valid.length} entries that did not match User shape.`,
        );
      }
      await this.users.seed(valid);
      this.logger.log(`Seeded ${valid.length} demo user(s) from ${path}`);
    } catch (err) {
      this.logger.error(
        `Failed to seed demo users from ${path}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  private resolveFixturePath(): string | undefined {
    const fromEnv = process.env.DEMO_USERS_PATH;
    const candidates = [
      ...(fromEnv ? [isAbsolute(fromEnv) ? fromEnv : resolve(process.cwd(), fromEnv)] : []),
      ...DEFAULT_PATHS,
    ];
    return candidates.find((p) => existsSync(p));
  }
}

const isUser = (v: unknown): v is User => {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.email === 'string' &&
    typeof o.displayName === 'string' &&
    typeof o.createdAt === 'string'
  );
};
