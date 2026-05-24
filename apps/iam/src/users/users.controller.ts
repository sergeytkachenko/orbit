import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiVersion, Public } from '@orbit/common';
import { CreateUserHandler } from './api/create-user.handler';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserV1Response, UserV2Response } from './dto/user.response';
import { toUserV1Response, toUserV2Response } from './shared/user.mapper';
import { UsersService } from './users.service';

@ApiTags('users')
// TODO(auth): swap @Public for proper user-auth (JWT/OIDC) when the
// identity flow lands. See ADR 0007 — this is the baseline, not the end
// state.
@Public()
@Controller({ path: 'users' })
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly createUser: CreateUserHandler,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a user' })
  async create(@Body() body: CreateUserDto): Promise<UserV2Response> {
    return this.createUser.asRest(body);
  }

  @Get()
  @ApiOperation({ summary: 'List users (v2 shape)' })
  async list(): Promise<UserV2Response[]> {
    const users = await this.users.findAll();
    return users.map(toUserV2Response);
  }

  @Get(':id')
  @ApiVersion('1')
  @ApiOperation({ summary: 'Get user by id (v1: id + email only)' })
  async getByIdV1(@Param('id') id: string): Promise<UserV1Response> {
    const user = await this.users.findById(id);
    return toUserV1Response(user);
  }

  @Get(':id')
  @ApiVersion('2')
  @ApiOperation({ summary: 'Get user by id (v2: full profile)' })
  async getByIdV2(@Param('id') id: string): Promise<UserV2Response> {
    const user = await this.users.findById(id);
    return toUserV2Response(user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  async update(@Param('id') id: string, @Body() patch: UpdateUserDto): Promise<UserV2Response> {
    const user = await this.users.update(id, patch);
    return toUserV2Response(user);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a user' })
  async delete(@Param('id') id: string): Promise<void> {
    await this.users.delete(id);
  }
}
