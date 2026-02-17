import { sha256 } from "../utils/hash.js";

export interface BlockData {
  type: "journal" | "build" | "adr" | "ops" | "ask" | "system" | "vault" | "credential";
  content: string;
  tags: string[];
  agent?: string;
  provider?: string;
  tokens_used?: number;
  // Vault & Credential fields
  encrypted?: string;
  iv?: string;
  key_id?: string;
  schema?: string;
  issuer?: string;
  holder?: string;
  proof?: string;
}

export interface Block {
  index: number;
  timestamp: string;
  chain: string;
  data: BlockData;
  prev_hash: string;
  hash: string;
}

// SOUL - Self-Organizing Universal Ledger Rules
const ALLOWED_TYPES = ["journal", "build", "adr", "ops", "ask", "system", "vault", "credential"];
const GENESIS_HASH = "0".repeat(64);
const SOUL_VERSION = "1.0.0";

export interface SoulValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a block against SOUL rules
 */
export function validateBlockAgainstSoul(block: Block, prevBlock?: Block): SoulValidationResult {
  const errors: string[] = [];

  // 1. Check hash format (64 hex chars)
  if (!/^[a-f0-9]{64}$/i.test(block.hash)) {
    errors.push(`Invalid hash format: ${block.hash}`);
  }

  // 2. Check prev_hash link
  const expectedPrevHash = prevBlock ? prevBlock.hash : GENESIS_HASH;
  if (block.prev_hash !== expectedPrevHash) {
    errors.push(`Broken chain link: expected ${expectedPrevHash}, got ${block.prev_hash}`);
  }

  // 3. Validate timestamp format (ISO 8601)
  const timestamp = new Date(block.timestamp);
  if (isNaN(timestamp.getTime())) {
    errors.push(`Invalid timestamp format: ${block.timestamp}`);
  }

  // 4. Check timestamp order
  if (prevBlock) {
    const prevTimestamp = new Date(prevBlock.timestamp);
    if (timestamp < prevTimestamp) {
      errors.push(`Timestamp ${block.timestamp} is before previous block ${prevBlock.timestamp}`);
    }
  }

  // 5. Validate data.content
  if (!block.data.content || typeof block.data.content !== "string" || block.data.content.trim().length === 0) {
    errors.push("Content must be non-empty string");
  }

  // 6. Validate data.type
  if (!ALLOWED_TYPES.includes(block.data.type)) {
    errors.push(`Invalid type: ${block.data.type}. Must be one of: ${ALLOWED_TYPES.join(", ")}`);
  }

  // 7. Validate data.tags is array
  if (!Array.isArray(block.data.tags)) {
    errors.push("Tags must be an array");
  }

  // 8. Validate index sequentiality
  if (prevBlock && block.index !== prevBlock.index + 1) {
    errors.push(`Invalid index: expected ${prevBlock.index + 1}, got ${block.index}`);
  }
  if (!prevBlock && block.index !== 0) {
    errors.push(`Genesis block must have index 0, got ${block.index}`);
  }

  // 9. Vault type validation (allow empty encrypted for genesis)
  if (block.data.type === "vault") {
    if (block.index > 0 && !block.data.encrypted) errors.push("Vault block must have encrypted data");
    if (!block.data.iv) errors.push("Vault block must have iv (Initialization Vector)");
  }

  // 10. Credential type validation (SSI)
  if (block.data.type === "credential") {
    if (!block.data.schema) errors.push("Credential block must have schema");
    if (!block.data.issuer) errors.push("Credential block must have issuer");
    if (!block.data.holder) errors.push("Credential block must have holder");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
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

export function verifyChain(blocks: Block[]): { valid: boolean; broken_at?: number; soul_errors?: string[] } {
  if (blocks.length === 0) return { valid: true };

  // Verify against SOUL rules
  const soulErrors: string[] = [];
  
  for (let i = 0; i < blocks.length; i++) {
    const prevBlock = i > 0 ? blocks[i - 1] : undefined;
    const soulResult = validateBlockAgainstSoul(blocks[i], prevBlock);
    
    if (!soulResult.valid) {
      soulErrors.push(`Block ${i}: ${soulResult.errors.join(", ")}`);
    }
  }

  // Standard hash verification
  if (!verifyBlock(blocks[0])) return { valid: false, broken_at: 0 };

  for (let i = 1; i < blocks.length; i++) {
    if (!verifyBlock(blocks[i], blocks[i - 1])) {
      return { valid: false, broken_at: i, soul_errors: soulErrors };
    }
  }

  if (soulErrors.length > 0) {
    return { valid: false, soul_errors: soulErrors };
  }
  
  return { valid: true };
}
