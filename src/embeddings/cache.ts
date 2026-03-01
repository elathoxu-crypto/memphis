/**
 * Embeddings Cache — LRU in-memory cache for vector embeddings
 *
 * Why:
 * - Avoid re-embedding same text (2-3s per block)
 * - Speed up recall (cache hits are <1ms vs 2-3s)
 * - Reduce API calls to Ollama/OpenAI
 *
 * How:
 * - LRU cache with configurable max size (default: 1000 vectors)
 * - Cache key = hash(text + model)
 * - Persists to disk on process exit
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

const MEMPHIS_HOME = process.env.MEMPHIS_HOME || path.join(os.homedir(), ".memphis");
const CACHE_FILE = path.join(MEMPHIS_HOME, "embeddings-cache.json");

export interface CacheEntry {
  hash: string; // hash(text + model)
  vector: number[];
  model: string;
  createdAt: string;
  accessedAt: string;
  accessCount: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hits: number;
  misses: number;
  hitRate: number;
}

export class EmbeddingCache {
  private cache: Map<string, CacheEntry> = new Map();
  private hits = 0;
  private misses = 0;
  private dirty = false;

  constructor(private readonly maxSize = 1000) {
    this.load();
    this.setupExitHandler();
  }

  /**
   * Generate cache key from text + model
   */
  private hashKey(text: string, model: string): string {
    const combined = `${text}:${model}`;
    return crypto.createHash("sha256").update(combined).digest("hex").slice(0, 16);
  }

  /**
   * Get cached vector for text
   */
  get(text: string, model: string): number[] | null {
    const key = this.hashKey(text, model);
    const entry = this.cache.get(key);

    if (entry) {
      // Update access stats
      entry.accessedAt = new Date().toISOString();
      entry.accessCount++;
      this.hits++;

      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, entry);

      return entry.vector;
    }

    this.misses++;
    return null;
  }

  /**
   * Store vector in cache
   */
  set(text: string, model: string, vector: number[]): void {
    const key = this.hashKey(text, model);

    // Evict LRU if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    const entry: CacheEntry = {
      hash: key,
      vector,
      model,
      createdAt: new Date().toISOString(),
      accessedAt: new Date().toISOString(),
      accessCount: 1,
    };

    this.cache.set(key, entry);
    this.dirty = true;
  }

  /**
   * Get multiple vectors (batch)
   */
  getBatch(texts: string[], model: string): (number[] | null)[] {
    return texts.map(text => this.get(text, model));
  }

  /**
   * Store multiple vectors (batch)
   */
  setBatch(pairs: Array<{ text: string; vector: number[] }>, model: string): void {
    for (const { text, vector } of pairs) {
      this.set(text, model, vector);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
    this.dirty = true;
  }

  /**
   * Load cache from disk
   */
  private load(): void {
    if (!existsSync(CACHE_FILE)) {
      return;
    }

    try {
      const data = JSON.parse(readFileSync(CACHE_FILE, "utf-8"));

      if (Array.isArray(data.entries)) {
        // Restore as LRU (oldest first)
        for (const entry of data.entries) {
          if (entry.hash && entry.vector && entry.model) {
            this.cache.set(entry.hash, entry);
          }
        }
      }

      this.hits = data.hits || 0;
      this.misses = data.misses || 0;

      console.error(`[EmbeddingCache] Loaded ${this.cache.size} entries from disk`);
    } catch (err) {
      console.error("[EmbeddingCache] Failed to load cache:", err);
    }
  }

  /**
   * Save cache to disk
   */
  private save(): void {
    if (!this.dirty) {
      return;
    }

    try {
      const dir = path.dirname(CACHE_FILE);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      const data = {
        version: 1,
        entries: Array.from(this.cache.values()),
        hits: this.hits,
        misses: this.misses,
        savedAt: new Date().toISOString(),
      };

      writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
      this.dirty = false;

      console.error(`[EmbeddingCache] Saved ${this.cache.size} entries to disk`);
    } catch (err) {
      console.error("[EmbeddingCache] Failed to save cache:", err);
    }
  }

  /**
   * Setup exit handler to persist cache
   */
  private setupExitHandler(): void {
    // Save on process exit
    process.on("beforeExit", () => this.save());
    process.on("SIGINT", () => {
      this.save();
      process.exit(0);
    });
    process.on("SIGTERM", () => {
      this.save();
      process.exit(0);
    });
  }

  /**
   * Force save (for testing)
   */
  forceSave(): void {
    this.save();
  }
}
