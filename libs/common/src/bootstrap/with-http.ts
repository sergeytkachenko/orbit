import { Logger as PinoLogger } from 'nestjs-pino';
import { Configurator } from './types';

export interface WithHttpOptions {
  port: number;
  /** Bind host; defaults to all interfaces. */
  host?: string;
}

/**
 * Starts the HTTP listener. Skipping this module yields a worker-only
 * service that exposes no REST surface — valid for an event consumer.
 */
export const withHttp =
  (opts: WithHttpOptions): Configurator =>
  async (app) => {
    await app.listen(opts.port, opts.host ?? '0.0.0.0');
    app.get(PinoLogger).log(`HTTP listening on :${opts.port}`, 'Bootstrap');
  };
