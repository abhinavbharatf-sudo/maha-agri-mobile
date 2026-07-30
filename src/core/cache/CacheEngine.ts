/**
 * Universal Cache Engine
 * Location: /src/core/cache/CacheEngine.ts
 * In-memory TTL cache with future Redis / Browser storage pluggability.
 */

interface CacheItem<T> {
  value: T;
  expiresAt: number;
}

export class CacheEngine {
  private static cache: Map<string, CacheItem<any>> = new Map();

  public static set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  public static get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  public static delete(key: string): void {
    this.cache.delete(key);
  }

  public static clear(): void {
    this.cache.clear();
  }
}
