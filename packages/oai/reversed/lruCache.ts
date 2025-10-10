/**
 * Lightweight LRU cache mirroring the behaviour used in `run-html-Do8mTV6K.js`.
 */

export interface LruCacheOptions {
  max: number;
  ttl: number;
}

interface Entry<V> {
  value: V;
  expiresAt: number;
}

export class LruCache<K, V> {
  private readonly options: LruCacheOptions;
  private readonly entries = new Map<K, Entry<V>>();

  constructor(options: LruCacheOptions) {
    this.options = options;
  }

  get(key: K): V | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    if (entry.expiresAt < Date.now()) {
      this.entries.delete(key);
      return undefined;
    }

    // Refresh the entry recency by reinserting it.
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    const expiresAt = Date.now() + this.options.ttl;
    this.entries.set(key, { value, expiresAt });
    this.trim();
  }

  private trim(): void {
    while (this.entries.size > this.options.max) {
      const [oldestKey] = this.entries.keys();
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }
  }
}
