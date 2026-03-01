import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { EmbeddingCache } from "../src/embeddings/cache.js";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const MEMPHIS_HOME = process.env.MEMPHIS_HOME || path.join(os.homedir(), ".memphis");
const CACHE_FILE = path.join(MEMPHIS_HOME, "test-embeddings-cache.json");

describe("EmbeddingCache", () => {
  let cache: EmbeddingCache;

  beforeEach(() => {
    // Use isolated test cache
    process.env.MEMPHIS_HOME = path.join(os.homedir(), ".memphis-test-cache");
    cache = new EmbeddingCache(100);
    cache.clear(); // Start fresh each test
  });

  afterEach(() => {
    cache.clear();
  });

  it("should cache and retrieve vectors", () => {
    const text = "test embedding";
    const model = "nomic-embed-text";
    const vector = [0.1, 0.2, 0.3];

    // Cache miss
    const miss = cache.get(text, model);
    expect(miss).toBeNull();

    // Store in cache
    cache.set(text, model, vector);

    // Cache hit
    const hit = cache.get(text, model);
    expect(hit).toEqual(vector);
  });

  it("should track cache stats", () => {
    const text1 = "text 1";
    const text2 = "text 2";
    const model = "test-model";
    const vector = [0.1, 0.2, 0.3];

    // 2 misses
    cache.get(text1, model);
    cache.get(text2, model);

    // 1 hit
    cache.set(text1, model, vector);
    cache.get(text1, model);

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(2);
    expect(stats.hitRate).toBeCloseTo(0.333);
  });

  it("should evict LRU entries at capacity", () => {
    const smallCache = new EmbeddingCache(3);
    const model = "test-model";
    const vector = [0.1, 0.2, 0.3];

    // Fill cache
    smallCache.set("text1", model, vector);
    smallCache.set("text2", model, vector);
    smallCache.set("text3", model, vector);

    expect(smallCache.getStats().size).toBe(3);

    // Add one more (should evict text1)
    smallCache.set("text4", model, vector);

    expect(smallCache.getStats().size).toBe(3);
    expect(smallCache.get("text1", model)).toBeNull(); // Evicted
    expect(smallCache.get("text2", model)).toEqual(vector); // Still there
  });

  it("should batch get and set", () => {
    const texts = ["text1", "text2", "text3"];
    const model = "test-model";
    const vectors = [
      [0.1, 0.2, 0.3],
      [0.4, 0.5, 0.6],
      [0.7, 0.8, 0.9],
    ];

    // Batch set
    cache.setBatch(
      texts.map((text, i) => ({ text, vector: vectors[i] })),
      model
    );

    // Batch get
    const results = cache.getBatch(texts, model);
    expect(results).toEqual(vectors);
  });

  it("should handle different models", () => {
    const text = "same text";
    const vector1 = [0.1, 0.2, 0.3];
    const vector2 = [0.4, 0.5, 0.6];

    cache.set(text, "model1", vector1);
    cache.set(text, "model2", vector2);

    expect(cache.get(text, "model1")).toEqual(vector1);
    expect(cache.get(text, "model2")).toEqual(vector2);
  });

  it("should persist to disk", () => {
    const text = "persistent text";
    const model = "test-model";
    const vector = [0.1, 0.2, 0.3];

    cache.set(text, model, vector);
    cache.forceSave();

    // Create new cache instance (loads from disk)
    const cache2 = new EmbeddingCache(100);
    const hit = cache2.get(text, model);

    expect(hit).toEqual(vector);

    // Cleanup
    cache2.clear();
  });
});
