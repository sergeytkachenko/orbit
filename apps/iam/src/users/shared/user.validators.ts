import { ValidationError } from '@orbit/common';

/**
 * LEVEL 2 — service-internal shared validators.
 *
 * Reused by `users.controller.ts` (REST), `users.grpc.controller.ts` (gRPC),
 * and the Level-3 `create-user.handler.ts`. Centralising these rules means
 * the same constraint produces identical error messages everywhere.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_DISPLAY_NAME = 80;

export const assertValidEmail = (email: unknown): string => {
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    throw new ValidationError('email must be a valid email address');
  }
  return email;
};

export const assertValidDisplayName = (name: unknown): string => {
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new ValidationError('displayName must be a non-empty string');
  }
  if (name.length > MAX_DISPLAY_NAME) {
    throw new ValidationError(`displayName must be ${MAX_DISPLAY_NAME} characters or fewer`);
  }
  return name;
};

export const assertValidId = (id: unknown): string => {
  if (typeof id !== 'string' || id.length === 0) {
    throw new ValidationError('id must be a non-empty string');
  }
  return id;
};
