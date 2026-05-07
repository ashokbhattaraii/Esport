import { Injectable } from "@nestjs/common";

/**
 * Tiny per-instance LRU-ish cache. On Vercel each serverless function holds
 * its own copy; cache hits within the same warm instance avoid DB hits during
 * a traffic spike. Falls back transparently — never throws.
 *
 * For multi-instance shared cache, swap this for Redis (not available here).
 */
@Injectable()
export class MemoryCacheService {
  private store = new Map<string, { value: unknown; expiresAt: number }>();
  private maxSize = 1000;

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    // refresh LRU order
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    if (this.store.size >= this.maxSize) {
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  delPrefix(prefix: string): void {
    for (const k of this.store.keys()) if (k.startsWith(prefix)) this.store.delete(k);
  }
}
