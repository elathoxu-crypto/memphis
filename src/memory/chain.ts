import { sha256 } from "../utils/hash.js";

export interface BlockData {
  type: "journal" | "build" | "adr" | "ops" | "ask" | "system";
  content: string;
  tags: string[];
  agent?: string;
  provider?: string;
  tokens_used?: number;
}

export interface Block {
  index: number;
  timestamp: string;
  chain: string;
  data: BlockData;
  prev_hash: string;
  hash: string;
}

export function createBlock(
  chain: string,
  data: BlockData,
  prevBlock?: Block
): Block {
  const partial = {
    index: prevBlock ? prevBlock.index + 1 : 0,
    timestamp: new Date().toISOString(),
    chain,
    data,
    prev_hash: prevBlock ? prevBlock.hash : "0".repeat(64),
  };

  const hash = sha256(JSON.stringify(partial));
  return { ...partial, hash };
}

export function verifyBlock(block: Block, prevBlock?: Block): boolean {
  // Check link
  if (prevBlock && block.prev_hash !== prevBlock.hash) return false;
  if (!prevBlock && block.prev_hash !== "0".repeat(64)) return false;

  // Check hash
  const { hash, ...rest } = block;
  const computed = sha256(JSON.stringify(rest));
  return computed === hash;
}

export function verifyChain(blocks: Block[]): { valid: boolean; broken_at?: number } {
  if (blocks.length === 0) return { valid: true };

  if (!verifyBlock(blocks[0])) return { valid: false, broken_at: 0 };

  for (let i = 1; i < blocks.length; i++) {
    if (!verifyBlock(blocks[i], blocks[i - 1])) {
      return { valid: false, broken_at: i };
    }
  }
  return { valid: true };
}
