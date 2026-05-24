import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { API_VERSION_HEADER, DEFAULT_API_VERSION } from '../versioning';
import { Configurator } from './types';

export interface WithSwaggerOptions {
  title: string;
  description: string;
  /** Mount path; defaults to `docs`. */
  path?: string;
  version?: string;
}

/**
 * Mounts Swagger UI. The description is annotated with the API-version
 * header convention so clients see how to switch response shapes.
 */
export const withSwagger =
  (opts: WithSwaggerOptions): Configurator =>
  (app) => {
    const doc = new DocumentBuilder()
      .setTitle(opts.title)
      .setDescription(
        `${opts.description}\n\nSet \`${API_VERSION_HEADER}\` to 1 or 2 to select the response shape (default: ${DEFAULT_API_VERSION}).`,
      )
      .setVersion(opts.version ?? '1.0')
      .build();
    SwaggerModule.setup(opts.path ?? 'docs', app, SwaggerModule.createDocument(app, doc));
  };
