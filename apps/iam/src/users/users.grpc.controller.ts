import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { InternalOnly } from '@orbit/common';
import { CreateUserRequest, GetUserRequest, IAM_SERVICE_NAME, IamUser } from '@orbit/contracts-iam';
import { CreateUserHandler } from './api/create-user.handler';
import { toGrpcUser } from './shared/user.mapper';
import { UsersService } from './users.service';

@InternalOnly()
@Controller()
export class UsersGrpcController {
  constructor(
    private readonly users: UsersService,
    private readonly createUser: CreateUserHandler,
  ) {}

  @GrpcMethod(IAM_SERVICE_NAME, 'GetUser')
  async getUser(request: GetUserRequest): Promise<IamUser> {
    const user = await this.users.findById(request.id);
    return toGrpcUser(user);
  }

  /**
   * Routes the gRPC request through the SAME Level-3 handler that powers
   * `POST /users`. The proof of cross-transport reuse lives one call below.
   */
  @GrpcMethod(IAM_SERVICE_NAME, 'CreateUser')
  async createUserRpc(request: CreateUserRequest): Promise<IamUser> {
    return this.createUser.asGrpc(request);
  }
}
