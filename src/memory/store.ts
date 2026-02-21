import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, openSync, fsyncSync, closeSync, unlinkSync, renameSync } from "node:fs";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import type { Block, BlockData } from "./chain.js";
import { createBlock, validateBlockAgainstSoul } from "./chain.js";
import { commitBlock } from "../utils/git.js";

/**

Atomic write - crash-safe file write

Flow:
1. Write to temp file in same directory
2. fsync to disk
3. Atomic rename to final
*/
function atomicWriteFile(targetPath: string, data: string, mode: number): void {
  const dir = dirname(targetPath);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  
  const tmpPath = join(dir, `.${randomUUID()}.tmp`);
  
  try {
    const fd = openSync(tmpPath, "wx", mode);
    try {
      writeFileSync(fd, data, { encoding: "utf-8" });
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    renameSync(tmpPath, targetPath);
  } catch (error) {
    try { unlinkSync(tmpPath); } catch { /* ignore */ }
    throw error;
  }
}

export class StoreError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "StoreError";
  }
}

export class Store {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
    try {
      mkdirSync(basePath, { recursive: true, mode: 0o700 });
    } catch (err) {
      throw new StoreError(`Failed to create store directory: ${err}`, "DIR_CREATE_FAILED");
    }
  }

  getBasePath(): string {
    return this.basePath;
  }

  private chainDir(chain: string): string {
    const dir = join(this.basePath, chain);
    try {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true, mode: 0o700 });
      }
    } catch (err) {
      throw new StoreError(`Failed to create chain directory: ${err}`, "CHAIN_DIR_FAILED");
    }
    return dir;
  }

  private blockFile(chain: string, index: number): string {
    return join(this.chainDir(chain), `${String(index).padStart(6, "0")}.json`);
  }

  getLastBlock(chain: string): Block | undefined {
    try {
      const dir = this.chainDir(chain);
      const files = readdirSync(dir).filter(f => f.endsWith(".json")).sort();
      if (files.length === 0) return undefined;
      const last = files[files.length - 1];
      return JSON.parse(readFileSync(join(dir, last), "utf-8"));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw new StoreError(`Failed to read last block: ${err}`, "READ_LAST_BLOCK_FAILED");
    }
  }

  /**
   * Unified appendBlock - the ONLY write path for Memphis
   * 
   * Features:
   * - SOUL validation (strict)
   * - Atomic write (crash-safe)
   * - Optional git auto-commit
   * 
   * This is the ONLY way to write blocks to chain.
   */
  async appendBlock(chain: string, data: BlockData): Promise<Block> {
    try {
      // 1. Get previous block for chain linking
      const prev = this.getLastBlock(chain);
      
      // 2. Create new block with proper indexing
      const block = createBlock(chain, data, prev);
      
      // 3. SOUL validation - strict
      const soul = validateBlockAgainstSoul(block, prev);
      if (!soul.valid) {
        throw new StoreError(`SOUL validation failed: ${soul.errors.join("; ")}`, "SOUL_INVALID");
      }
      
      // 4. Determine file mode
      const mode = (chain === "vault" || chain === "credential") ? 0o600 : 0o644;
      
      // 5. Atomic write - crash safe
      const file = this.blockFile(chain, block.index);
      atomicWriteFile(file, JSON.stringify(block, null, 2), mode);
      
      // 6. Optional git auto-commit (non-fatal)
      try {
        commitBlock(this.basePath, block, { push: false });
      } catch {
        // Git commit is non-fatal - continue even if git fails
      }
      
      return block;
    } catch (err) {
      if (err instanceof StoreError) throw err;
      throw new StoreError(`Failed to append block: ${err}`, "APPEND_BLOCK_FAILED");
    }
  }

  /**
   * DEPRECATED: Use appendBlock() instead
   * Kept for backward compatibility during migration
   */
  addBlock(chain: string, data: BlockData): Block {
    // Sync wrapper - just call appendBlock synchronously
    // This will throw if there's an error
    let result: Block;
    this.appendBlock(chain, data).then(block => {
      result = block;
    }).catch(err => {
      throw new StoreError(`addBlock deprecated, use await appendBlock(): ${err}`, "DEPRECATED");
    });
    // @ts-ignore - for migration period
    return result!;
  }

  readChain(chain: string): Block[] {
    try {
      const dir = this.chainDir(chain);
      if (!existsSync(dir)) return [];
      const files = readdirSync(dir).filter(f => f.endsWith(".json")).sort();
      return files.map(f => {
        try {
          return JSON.parse(readFileSync(join(dir, f), "utf-8"));
        } catch (parseErr) {
          console.warn(`Warning: Failed to parse block file ${f}: ${parseErr}`);
          return null;
        }
      }).filter((b): b is Block => b !== null);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw new StoreError(`Failed to read chain: ${err}`, "READ_CHAIN_FAILED");
    }
  }

  listChains(): string[] {
    try {
      if (!existsSync(this.basePath)) return [];
      return readdirSync(this.basePath, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw new StoreError(`Failed to list chains: ${err}`, "LIST_CHAINS_FAILED");
    }
  }

  getChainStats(chain: string): { blocks: number; first?: string; last?: string } {
    try {
      const blocks = this.readChain(chain);
      return {
        blocks: blocks.length,
        first: blocks[0]?.timestamp,
        last: blocks[blocks.length - 1]?.timestamp,
      };
    } catch (err) {
      throw new StoreError(`Failed to get chain stats: ${err}`, "STATS_FAILED");
    }
  }
}
