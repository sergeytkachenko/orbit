import { Request } from 'express';
import {
  API_VERSION_HEADER,
  DEFAULT_API_VERSION,
  SUPPORTED_API_VERSIONS,
  SupportedApiVersion,
} from './versioning.constants';

/**
 * Custom version extractor used with `VersioningType.CUSTOM`.
 *
 * Reads the `X-Orbit-Api-Version` request header and returns the matching
 * supported version, or `DEFAULT_API_VERSION` when the header is absent or
 * holds an unknown value.
 *
 * Lives in @orbit/common so both apps share the exact same versioning rule
 * — there is no per-controller `if (version === '2')` branching anywhere.
 */
export const headerVersionExtractor = (request: unknown): SupportedApiVersion => {
  const headers = (request as Request)?.headers ?? {};
  const raw = headers[API_VERSION_HEADER.toLowerCase()];
  const value = Array.isArray(raw) ? raw[0] : raw;

  if (typeof value === 'string' && (SUPPORTED_API_VERSIONS as readonly string[]).includes(value)) {
    return value as SupportedApiVersion;
  }
  return DEFAULT_API_VERSION;
};
