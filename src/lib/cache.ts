// Simple in-memory cache with TTL
// Used by API routes to reduce calls to n8n/Monday

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class SimpleCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 60s
    if (typeof setInterval !== "undefined") {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
    }
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  // Invalidate all keys matching a pattern
  invalidatePattern(pattern: string): void {
    const keys = Array.from(this.store.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.store.delete(key);
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }
}

// Singleton instance
export const cache = new SimpleCache();

// TTL constants
export const CACHE_TTL = {
  TELEFONOS: 45_000,      // 45s - balance between freshness and performance
  REPARACIONES: 45_000,   // 45s
  TECNICOS: 120_000,      // 2min - rarely changes
} as const;
