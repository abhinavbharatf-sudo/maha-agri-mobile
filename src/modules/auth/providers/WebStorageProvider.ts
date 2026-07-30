/**
 * WebStorageProvider
 * Implementation of IStorageRepository for Web browsers (localStorage/sessionStorage).
 * Pluggable with React Native SecureStore in future mobile deployments.
 */

import type { IStorageRepository } from '../repositories/StorageRepository';

export class WebStorageProvider implements IStorageRepository {
  async getItem(key: string): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
    } catch (err) {
      console.warn('[WebStorageProvider] Failed to save key', key, err);
    }
  }

  async removeItem(key: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch (err) {
      console.warn('[WebStorageProvider] Failed to remove key', key, err);
    }
  }

  async clear(): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.clear();
    } catch (err) {
      console.warn('[WebStorageProvider] Failed to clear storage', err);
    }
  }
}

export const defaultStorageProvider = new WebStorageProvider();
