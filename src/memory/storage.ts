/**
 * Storage Abstraction Layer — IStorageService
 *
 * Decouples Memphis core logic from the underlying persistence backend.
 * Current backends: JsonlStorage (default, file-per-block JSONL)
 * Future backends: SqliteStorage, WeaviateStorage, InMemoryStorage (testing)
 *
 * Design principles:
 *  - Async throughout (storage I/O is inherently async)
 *  - Backend-agnostic Block model (same Block type everywhere)
 *  - Append-only writes (no in-place mutation of blocks)
 *  - Pluggable: swap backend without touching core logic
 */

import type { Block, BlockData } from "./chain.js";
import { Store } from "./store.js";

// ─── Interface ───────────────────────────────────────────────────────────────

export interface ChainStats {
  blocks: number;
  first?: string;   // ISO timestamp of first block
  last?: string;    // ISO timestamp of last block
  sizeBytes?: number;
}

export interface QueryOptions {
  type?: string;
  tags?: string[];
  since?: string;   // ISO or e.g. "7d"
  until?: string;
  limit?: number;
  offset?: number;
}

export interface IStorageService {
  readonly name: string;

  /** Append a block to a chain. Returns the persisted Block. */
  appendBlock(chain: string, data: BlockData): Promise<Block>;

  /** Read all blocks from a chain (ordered by index). */
  readChain(chain: string, options?: QueryOptions): Promise<Block[]>;

  /** List all chain names. */
  listChains(): Promise<string[]>;

  /** Get stats for a chain without loading all blocks. */
  chainStats(chain: string): Promise<ChainStats>;

  /** Get the last block of a chain (efficient). */
  lastBlock(chain: string): Promise<Block | undefined>;

  /** Get a specific block by chain + index. */
  getBlock(chain: string, index: number): Promise<Block | undefined>;

  /** Check if the storage backend is healthy / reachable. */
  ping(): Promise<boolean>;

  /** Close/cleanup connections. */
  close(): Promise<void>;
}

// ─── JsonlStorage (wraps existing Store) ────────────────────────────────────

function parseSince(since: string): Date {
  const match = since.match(/^(\d+)(d|h|w|m)$/);
  if (match) {
    const n = parseInt(match[1]);
    const unit = match[2];
    const ms: Record<string, number> = { h: 3600e3, d: 86400e3, w: 604800e3, m: 2592000e3 };
    return new Date(Date.now() - n * (ms[unit] ?? ms.d));
  }
  const d = new Date(since);
  if (!isNaN(d.getTime())) return d;
  return new Date(0);
}

export class JsonlStorage implements IStorageService {
  readonly name = "jsonl";
  private store: Store;

  constructor(basePath: string) {
    this.store = new Store(basePath);
  }

  async appendBlock(chain: string, data: BlockData): Promise<Block> {
    return this.store.appendBlock(chain, data);
  }

  async readChain(chain: string, options: QueryOptions = {}): Promise<Block[]> {
    let blocks = this.store.readChain(chain);

    if (options.type) {
      blocks = blocks.filter(b => b.data.type === options.type);
    }

    if (options.tags?.length) {
      const required = options.tags;
      blocks = blocks.filter(b => required.every(t => b.data.tags?.includes(t)));
    }

    if (options.since) {
      const from = parseSince(options.since);
      blocks = blocks.filter(b => new Date(b.timestamp) >= from);
    }

    if (options.until) {
      const to = new Date(options.until);
      blocks = blocks.filter(b => new Date(b.timestamp) <= to);
    }

    if (options.offset) {
      blocks = blocks.slice(options.offset);
    }

    if (options.limit) {
      blocks = blocks.slice(0, options.limit);
    }

    return blocks;
  }

  async listChains(): Promise<string[]> {
    return this.store.listChains();
  }

  async chainStats(chain: string): Promise<ChainStats> {
    const stats = this.store.getChainStats(chain);
    return stats;
  }

  async lastBlock(chain: string): Promise<Block | undefined> {
    return this.store.getLastBlock(chain);
  }

  async getBlock(chain: string, index: number): Promise<Block | undefined> {
    const blocks = await this.readChain(chain);
    return blocks.find(b => b.index === index);
  }

  async ping(): Promise<boolean> {
    try {
      await this.listChains();
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    // JSONL has no persistent connections to close
  }

  /** Access underlying Store for legacy code paths */
  getStore(): Store {
    return this.store;
  }
}

// ─── InMemoryStorage (for testing) ──────────────────────────────────────────

export class InMemoryStorage implements IStorageService {
  readonly name = "memory";
  private chains = new Map<string, Block[]>();
  private counters = new Map<string, number>();

  async appendBlock(chain: string, data: BlockData): Promise<Block> {
    const { createBlock } = await import("./chain.js");
    const blocks = this.chains.get(chain) ?? [];
    const prev = blocks[blocks.length - 1];
    const block = createBlock(chain, data, prev);
    blocks.push(block);
    this.chains.set(chain, blocks);
    return block;
  }

  async readChain(chain: string, options: QueryOptions = {}): Promise<Block[]> {
    let blocks = this.chains.get(chain) ?? [];

    if (options.type) blocks = blocks.filter(b => b.data.type === options.type);
    if (options.tags?.length) {
      blocks = blocks.filter(b => options.tags!.every(t => b.data.tags?.includes(t)));
    }
    if (options.since) {
      const from = parseSince(options.since);
      blocks = blocks.filter(b => new Date(b.timestamp) >= from);
    }
    if (options.offset) blocks = blocks.slice(options.offset);
    if (options.limit) blocks = blocks.slice(0, options.limit);

    return blocks;
  }

  async listChains(): Promise<string[]> {
    return Array.from(this.chains.keys());
  }

  async chainStats(chain: string): Promise<ChainStats> {
    const blocks = this.chains.get(chain) ?? [];
    return {
      blocks: blocks.length,
      first: blocks[0]?.timestamp,
      last: blocks[blocks.length - 1]?.timestamp,
    };
  }

  async lastBlock(chain: string): Promise<Block | undefined> {
    const blocks = this.chains.get(chain) ?? [];
    return blocks[blocks.length - 1];
  }

  async getBlock(chain: string, index: number): Promise<Block | undefined> {
    return (this.chains.get(chain) ?? []).find(b => b.index === index);
  }

  async ping(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {
    this.chains.clear();
  }

  /** Seed test data */
  seed(chain: string, blocks: Block[]) {
    this.chains.set(chain, blocks);
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────

export type StorageBackend = "jsonl" | "memory";

export interface StorageConfig {
  backend?: StorageBackend;
  basePath?: string;
}

export function createStorage(config: StorageConfig = {}): IStorageService {
  const backend = config.backend ?? "jsonl";

  switch (backend) {
    case "jsonl":
      if (!config.basePath) throw new Error("JsonlStorage requires basePath");
      return new JsonlStorage(config.basePath);
    case "memory":
      return new InMemoryStorage();
    default:
      throw new Error(`Unknown storage backend: ${backend}`);
  }
}
