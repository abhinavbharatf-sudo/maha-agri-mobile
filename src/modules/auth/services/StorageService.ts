/**
 * StorageService
 * Business logic wrapper isolating local storage calls from UI & business services.
 */

import type { IStorageRepository } from '../repositories/StorageRepository';
import { defaultStorageProvider } from '../providers/WebStorageProvider';
import { AUTH_STORAGE_KEYS } from '../constants/auth.constants';
import type { MahaAgriSession, MahaAgriRole } from '../types/auth.types';

export class StorageService {
  constructor(private provider: IStorageRepository = defaultStorageProvider) {}

  async saveSession(session: MahaAgriSession): Promise<void> {
    await this.provider.setItem(AUTH_STORAGE_KEYS.SESSION, JSON.stringify(session));
    if (session.token) {
      await this.provider.setItem(AUTH_STORAGE_KEYS.TOKEN, session.token);
    }
  }

  async getSession(): Promise<MahaAgriSession | null> {
    const raw = await this.provider.getItem(AUTH_STORAGE_KEYS.SESSION);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MahaAgriSession;
    } catch {
      return null;
    }
  }

  async saveActiveRole(role: MahaAgriRole): Promise<void> {
    await this.provider.setItem(AUTH_STORAGE_KEYS.ACTIVE_ROLE, JSON.stringify(role));
  }

  async getActiveRole(): Promise<MahaAgriRole | null> {
    const raw = await this.provider.getItem(AUTH_STORAGE_KEYS.ACTIVE_ROLE);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as MahaAgriRole;
    } catch {
      return null;
    }
  }

  async clearSession(): Promise<void> {
    await this.provider.removeItem(AUTH_STORAGE_KEYS.SESSION);
    await this.provider.removeItem(AUTH_STORAGE_KEYS.ACTIVE_ROLE);
    await this.provider.removeItem(AUTH_STORAGE_KEYS.TOKEN);
  }
}

export const storageService = new StorageService();
