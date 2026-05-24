import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Notification, NotificationStatus } from './notification.entity';

export abstract class NotificationsRepository {
  abstract create(input: Omit<Notification, 'id' | 'createdAt' | 'status'>): Promise<Notification>;
  abstract findById(id: string): Promise<Notification | null>;
  abstract findAll(): Promise<Notification[]>;
  /**
   * Update the delivery status of an existing notification. Used by the
   * async dispatch emulator to flip pending → sent once "delivery"
   * resolves. Returns the updated notification, or `null` if the id is
   * unknown (e.g. removed mid-flight).
   */
  abstract updateStatus(id: string, status: NotificationStatus): Promise<Notification | null>;
}

@Injectable()
export class InMemoryNotificationsRepository extends NotificationsRepository {
  private readonly store = new Map<string, Notification>();

  async create(input: Omit<Notification, 'id' | 'createdAt' | 'status'>): Promise<Notification> {
    const notification: Notification = {
      ...input,
      id: randomUUID(),
      status: NotificationStatus.Pending,
      createdAt: new Date().toISOString(),
    };
    this.store.set(notification.id, notification);
    return notification;
  }

  async findById(id: string): Promise<Notification | null> {
    return this.store.get(id) ?? null;
  }

  async findAll(): Promise<Notification[]> {
    return [...this.store.values()];
  }

  async updateStatus(id: string, status: NotificationStatus): Promise<Notification | null> {
    const existing = this.store.get(id);
    if (!existing) return null;
    const updated: Notification = { ...existing, status };
    this.store.set(id, updated);
    return updated;
  }
}
