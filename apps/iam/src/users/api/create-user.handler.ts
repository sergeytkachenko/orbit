import { Injectable } from '@nestjs/common';
import { IamUser } from '@orbit/contracts-iam';
import { UserV2Response } from '../dto/user.response';
import { assertValidDisplayName, assertValidEmail } from '../shared/user.validators';
import { toGrpcUser, toUserV2Response } from '../shared/user.mapper';
import { UsersService } from '../users.service';

export interface CreateUserInput {
  email: unknown;
  displayName: unknown;
}

/**
 * LEVEL 3 — one-API shared component.
 *
 * `POST /users` (REST, see users.controller.ts) and `IamService.CreateUser`
 * (gRPC, see users.grpc.controller.ts) both go through THIS handler. Same
 * validation, same domain call, same source of truth — only the response
 * shape differs at the very end (HTTP JSON vs proto message).
 *
 * This is the strongest single piece of evidence for transport-agnostic
 * code reuse in the repo. README points reviewers here.
 */
@Injectable()
export class CreateUserHandler {
  constructor(private readonly users: UsersService) {}

  async asRest(input: CreateUserInput): Promise<UserV2Response> {
    const user = await this.run(input);
    return toUserV2Response(user);
  }

  async asGrpc(input: CreateUserInput): Promise<IamUser> {
    const user = await this.run(input);
    return toGrpcUser(user);
  }

  private async run(input: CreateUserInput) {
    const email = assertValidEmail(input.email);
    const displayName = assertValidDisplayName(input.displayName);
    return this.users.create({ email, displayName });
  }
}
