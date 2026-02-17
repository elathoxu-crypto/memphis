import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Block, BlockData } from "./chain.js";
import { createBlock } from "./chain.js";

export class Store {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
    mkdirSync(basePath, { recursive: true });
  }

  private chainDir(chain: string): string {
    const dir = join(this.basePath, chain);
    mkdirSync(dir, { recursive: true });
    return dir;
  }

  private blockFile(chain: string, index: number): string {
    return join(this.chainDir(chain), `${String(index).padStart(6, "0")}.json`);
  }

  getLastBlock(chain: string): Block | undefined {
    const dir = this.chainDir(chain);
    const files = readdirSync(dir).filter(f => f.endsWith(".json")).sort();
    if (files.length === 0) return undefined;
    const last = files[files.length - 1];
    return JSON.parse(readFileSync(join(dir, last), "utf-8"));
  }

  addBlock(chain: string, data: BlockData): Block {
    const prev = this.getLastBlock(chain);
    const block = createBlock(chain, data, prev);
    const file = this.blockFile(chain, block.index);
    writeFileSync(file, JSON.stringify(block, null, 2), "utf-8");
    return block;
  }

  readChain(chain: string): Block[] {
    const dir = this.chainDir(chain);
    if (!existsSync(dir)) return [];
    const files = readdirSync(dir).filter(f => f.endsWith(".json")).sort();
    return files.map(f => JSON.parse(readFileSync(join(dir, f), "utf-8")));
  }

  listChains(): string[] {
    if (!existsSync(this.basePath)) return [];
    return readdirSync(this.basePath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
  }

  getChainStats(chain: string): { blocks: number; first?: string; last?: string } {
    const blocks = this.readChain(chain);
    return {
      blocks: blocks.length,
      first: blocks[0]?.timestamp,
      last: blocks[blocks.length - 1]?.timestamp,
    };
  }
}
