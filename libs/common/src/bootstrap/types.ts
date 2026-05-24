import { INestApplication, Type } from '@nestjs/common';

/**
 * Each `with*()` module returns a `Configurator`: a function that runs
 * during bootstrap and may mutate the Nest application (register
 * middleware, attach a microservice, mount Swagger, etc.).
 *
 * Returning a Promise is supported so async setup (e.g. starting an OTel
 * SDK) can fit in the same pipeline.
 */
export type Configurator = (app: INestApplication) => void | Promise<void>;

export interface ServiceBuilderInit {
  AppModule: Type<unknown>;
  /** Used in startup logs. */
  serviceName: string;
}
