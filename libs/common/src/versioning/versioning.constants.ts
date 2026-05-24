export const API_VERSION_HEADER = 'X-Orbit-Api-Version';
export const DEFAULT_API_VERSION = '1';
export const SUPPORTED_API_VERSIONS = ['1', '2'] as const;
export type SupportedApiVersion = (typeof SUPPORTED_API_VERSIONS)[number];
