import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { Logger as PinoLogger } from 'nestjs-pino';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { RequestContextMiddleware } from '../context/request-context.middleware';
import { AllExceptionsFilter } from '../errors/all-exceptions.filter';
import { DEFAULT_API_VERSION, headerVersionExtractor } from '../versioning';
import { Configurator, ServiceBuilderInit } from './types';

/**
 * Composable bootstrap. A service starts by constructing a builder, layering
 * the `with*` modules it needs, then calling `.run()`:
 *
 *   await new ServiceBuilder({ AppModule, serviceName: 'iam' })
 *     .with(withHttp({ port: 3001 }))
 *     .with(withGrpc({ packageName, protoPath, port: 50051 }))
 *     .with(withSwagger({ title: 'Orbit iam', description: '...' }))
 *     .run();
 *
 * Global concerns that every service must have (Pino logger, correlation
 * middleware, validation pipe, global exception filter, custom versioning,
 * shutdown hooks) are applied unconditionally during `run()` so individual
 * services can't accidentally drop them.
 */
export class ServiceBuilder {
  private readonly configurators: Configurator[] = [];

  constructor(private readonly init: ServiceBuilderInit) {}

  with(configurator: Configurator): this {
    this.configurators.push(configurator);
    return this;
  }

  async run(): Promise<INestApplication> {
    const app = await NestFactory.create(this.init.AppModule, { bufferLogs: true });

    // Always-on globals — see class doc.
    app.useLogger(app.get(PinoLogger));
    const ctxMiddleware = new RequestContextMiddleware();
    app.use(ctxMiddleware.use.bind(ctxMiddleware));
    app.enableVersioning({
      type: VersioningType.CUSTOM,
      extractor: headerVersionExtractor,
      defaultVersion: DEFAULT_API_VERSION,
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalGuards(new ApiKeyGuard(app.get(Reflector)));
    app.enableShutdownHooks();

    // Apply each `with*` configurator in declared order. They may
    // register microservices, mount Swagger, attach interceptors, etc.
    for (const cfg of this.configurators) {
      await cfg(app);
    }

    await app.startAllMicroservices();
    return app;
  }
}
