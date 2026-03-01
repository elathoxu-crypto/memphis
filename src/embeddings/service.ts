import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Block } from "../memory/chain.js";
import { Store } from "../memory/store.js";

const MEMPHIS_HOME = process.env.MEMPHIS_HOME || path.join(os.homedir(), ".memphis");
const EMBEDDINGS_ROOT = path.join(MEMPHIS_HOME, "embeddings");

export interface EmbedOptions {
  chain: string;
  since?: string;
  limit?: number;
  force?: boolean;
  dryRun?: boolean;
}

export interface EmbedStats {
  chain: string;
  processed: number;
  skipped: number;
  durationMs: number;
  backend: string;
  model: string;
}

export interface EmbedReportEntry {
  chain: string;
  totalVectors: number;
  lastRun?: string;
  backend: string;
  model: string;
}

export interface EmbeddingBackend {
  readonly name: string;
  readonly model: string;
  init(): Promise<void>;
  embedBlocks(blocks: Block[]): Promise<number[][]>;
}

export interface EmbedEvent {
  type: "start" | "skip" | "process" | "end";
  chain: string;
  blockIndex?: number;
  processed?: number;
  skipped?: number;
  durationMs?: number;
}

function safeReadJson(file: string) {
  try {
    return JSON.parse(readFileSync(file, "utf-8"));
  } catch {
    return null;
  }
}

function safeWriteJson(file: string, data: unknown) {
  writeFileSync(file, JSON.stringify(data, null, 2));
}

function ensureDir(dir: string) {
  mkdirSync(dir, { recursive: true });
}

export class EmbeddingService {
  constructor(private readonly store: Store, private readonly backend: EmbeddingBackend) {}

  private getChainDir(chain: string) {
    const dir = path.join(EMBEDDINGS_ROOT, chain);
    ensureDir(path.join(dir, "blocks"));
    return dir;
  }

  private loadMeta(chain: string) {
    const file = path.join(this.getChainDir(chain), "meta.json");
    const meta = safeReadJson(file);
    if (meta) return meta;
    return {
      totalVectors: 0,
      lastRun: null,
      backend: this.backend.name,
      model: this.backend.model,
    };
  }

  private saveMeta(chain: string, meta: any) {
    const file = path.join(this.getChainDir(chain), "meta.json");
    safeWriteJson(file, meta);
  }

  private hasVector(chain: string, hash?: string) {
    if (!hash) return false;
    const file = path.join(this.getChainDir(chain), "index.json");
    const index = safeReadJson(file) || [];
    return Array.isArray(index) && index.some((entry: any) => entry.hash === hash);
  }

  private persistVector(chain: string, block: Block, vector: number[]) {
    const dir = this.getChainDir(chain);
    const indexFile = path.join(dir, "index.json");
    let index: any[] = safeReadJson(indexFile) || [];

    index = index.filter(entry => entry.hash !== block.hash);
    index.push({ hash: block.hash, blockIndex: block.index, updatedAt: new Date().toISOString() });
    safeWriteJson(indexFile, index);

    const blockFile = path.join(dir, "blocks", `${block.index}.json`);
    safeWriteJson(blockFile, { hash: block.hash, vector, createdAt: new Date().toISOString() });
  }

  async *embedChain(options: EmbedOptions): AsyncGenerator<EmbedEvent, EmbedStats> {
    const start = Date.now();
    const chain = options.chain;
    yield { type: "start", chain };

    const blocks = this.store.readChain(chain);
    const meta = this.loadMeta(chain);
    const limit = options.limit ?? blocks.length;

    let processed = 0;
    let skipped = 0;

    const sinceTs = options.since ? new Date(options.since).getTime() : undefined;

    // Collect blocks to embed (respecting limit and since)
    const toEmbed: Block[] = [];
    for (const block of blocks) {
      if (processed + skipped >= limit) break;
      if (sinceTs && new Date(block.timestamp).getTime() < sinceTs) {
        skipped++;
        continue;
      }

      const alreadyEmbedded = !options.force && this.hasVector(chain, block.hash);
      if (alreadyEmbedded) {
        skipped++;
        yield { type: "skip", chain, blockIndex: block.index };
        continue;
      }

      toEmbed.push(block);
      processed++;
    }

    // Batch embed all blocks at once (much faster than sequential)
    if (!options.dryRun && toEmbed.length > 0) {
      await this.backend.init();
      const vectors = await this.backend.embedBlocks(toEmbed);

      for (let i = 0; i < toEmbed.length; i++) {
        const block = toEmbed[i];
        const vector = vectors[i];
        if (vector) {
          this.persistVector(chain, block, vector);
          yield { type: "process", chain, blockIndex: block.index };
        }
      }
    }

    const durationMs = Date.now() - start;

    if (!options.dryRun) {
      meta.totalVectors = (meta.totalVectors || 0) + processed;
      meta.lastRun = new Date().toISOString();
      meta.backend = this.backend.name;
      meta.model = this.backend.model;
      this.saveMeta(chain, meta);
    }

    yield { type: "end", chain, processed, skipped, durationMs };

    return {
      chain,
      processed,
      skipped,
      durationMs,
      backend: this.backend.name,
      model: this.backend.model,
    };
  }

  getReport(chain?: string): EmbedReportEntry[] {
    if (chain) {
      const entry = this.readReportEntry(chain);
      return entry ? [entry] : [];
    }

    const chains = this.store.listChains();
    return chains
      .map(c => this.readReportEntry(c))
      .filter((entry): entry is EmbedReportEntry => Boolean(entry));
  }

  private readReportEntry(chain: string): EmbedReportEntry | null {
    const dir = path.join(EMBEDDINGS_ROOT, chain);
    const meta = safeReadJson(path.join(dir, "meta.json"));
    if (!meta) return null;
    return {
      chain,
      totalVectors: meta.totalVectors || 0,
      lastRun: meta.lastRun,
      backend: meta.backend,
      model: meta.model,
    };
  }
}
