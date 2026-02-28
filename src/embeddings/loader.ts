
import path from "node:path";
import os from "node:os";
import { readFileSync } from "node:fs";

const MEMPHIS_HOME = process.env.MEMPHIS_HOME || path.join(os.homedir(), ".memphis");
const EMBEDDINGS_ROOT = path.join(MEMPHIS_HOME, "embeddings");

interface SemanticHit {
  chain: string;
  hash: string;
  vector: number[];
  blockIndex: number;
  timestamp: string;
}

export function loadSemanticIndex(chain: string): SemanticHit[] {
  try {
    const indexPath = path.join(EMBEDDINGS_ROOT, chain, "index.json");
    const blocksDir = path.join(EMBEDDINGS_ROOT, chain, "blocks");
    const index = JSON.parse(readFileSync(indexPath, "utf-8"));
    return index.map((entry: any) => {
      const block = JSON.parse(readFileSync(path.join(blocksDir, `${entry.blockIndex}.json`), "utf-8"));
      return {
        chain,
        hash: block.hash,
        vector: block.vector,
        blockIndex: entry.blockIndex,
        timestamp: entry.updatedAt,
      };
    });
  } catch {
    return [];
  }
}
