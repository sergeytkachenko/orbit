import { applyDecorators, Version } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { API_VERSION_HEADER, SupportedApiVersion } from './versioning.constants';

/**
 * `@ApiVersion('2')` — declares the API version for a handler.
 *
 * Composes Nest's `@Version()` (routes the request) with `@ApiHeader()`
 * (documents the header in Swagger). One decorator instead of two,
 * applied identically across services.
 */
export const ApiVersion = (version: SupportedApiVersion) =>
  applyDecorators(
    Version(version),
    ApiHeader({
      name: API_VERSION_HEADER,
      required: false,
      description: `API version. Defaults to "1" when absent. Supported: 1, 2.`,
      schema: { type: 'string', enum: ['1', '2'], example: version },
    }),
  );
