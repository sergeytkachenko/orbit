import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { User } from './user.entity';

/**
 * Storage interface — kept abstract so the service depends on a port,
 * not on the in-memory implementation. Swapping in Postgres later means
 * adding a second class behind the same interface.
 */
export abstract class UsersRepository {
  abstract create(input: Pick<User, 'email' | 'displayName'>): Promise<User>;
  abstract findById(id: string): Promise<User | null>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findAll(): Promise<User[]>;
  abstract update(id: string, patch: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null>;
  abstract delete(id: string): Promise<boolean>;
  /**
   * Bulk-insert fixtures with caller-supplied ids/timestamps. Used by the
   * demo-data seeder so loaded entries keep their stable ids across
   * restarts.
   */
  abstract seed(users: User[]): Promise<void>;
  abstract count(): Promise<number>;
}

@Injectable()
export class InMemoryUsersRepository extends UsersRepository {
  private readonly store = new Map<string, User>();

  async create(input: Pick<User, 'email' | 'displayName'>): Promise<User> {
    const user: User = {
      id: randomUUID(),
      email: input.email,
      displayName: input.displayName,
      createdAt: new Date().toISOString(),
    };
    this.store.set(user.id, user);
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.store.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    for (const user of this.store.values()) {
      if (user.email === email) return user;
    }
    return null;
  }

  async findAll(): Promise<User[]> {
    return [...this.store.values()];
  }

  async update(id: string, patch: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated: User = { ...existing, ...patch };
    this.store.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.store.delete(id);
  }

  async seed(users: User[]): Promise<void> {
    for (const u of users) this.store.set(u.id, u);
  }

  async count(): Promise<number> {
    return this.store.size;
  }
}
