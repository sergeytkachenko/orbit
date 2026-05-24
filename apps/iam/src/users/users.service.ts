import { Injectable } from '@nestjs/common';
import { ConflictError, NotFoundError } from '@orbit/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './user.entity';
import { UsersRepository } from './users.repository';
import { assertValidDisplayName, assertValidEmail, assertValidId } from './shared/user.validators';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async findAll(): Promise<User[]> {
    return this.repo.findAll();
  }

  async findById(id: string): Promise<User> {
    assertValidId(id);
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError(`User ${id} not found`);
    return user;
  }

  /**
   * Reserved for direct callers (e.g. tests). The shared create flow lives
   * in `api/create-user.handler.ts` so REST and gRPC controllers go through
   * the same path. Service layer remains storage-aware only.
   */
  async create(input: { email: string; displayName: string }): Promise<User> {
    const existing = await this.repo.findByEmail(input.email);
    if (existing) throw new ConflictError(`User with email ${input.email} already exists`);
    return this.repo.create(input);
  }

  async update(id: string, patch: UpdateUserDto): Promise<User> {
    assertValidId(id);
    if (patch.email !== undefined) assertValidEmail(patch.email);
    if (patch.displayName !== undefined) assertValidDisplayName(patch.displayName);

    const updated = await this.repo.update(id, patch);
    if (!updated) throw new NotFoundError(`User ${id} not found`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    assertValidId(id);
    const deleted = await this.repo.delete(id);
    if (!deleted) throw new NotFoundError(`User ${id} not found`);
  }
}
