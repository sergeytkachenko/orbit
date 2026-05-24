import { IamUser } from '@orbit/contracts-iam';
import { UserV1Response, UserV2Response } from '../dto/user.response';
import { User } from '../user.entity';

/**
 * LEVEL 2 — service-internal shared mappers.
 *
 * Single source of truth for entity → response shape conversion. Used by
 * both the REST controller (for v1/v2 responses) and the gRPC controller
 * (for the proto User message). When the User entity gains a field, only
 * this file needs to decide which versions/transports expose it.
 */

export const toUserV1Response = (user: User): UserV1Response => ({
  id: user.id,
  email: user.email,
});

export const toUserV2Response = (user: User): UserV2Response => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  createdAt: user.createdAt,
});

export const toGrpcUser = (user: User): IamUser => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  createdAt: user.createdAt,
});
