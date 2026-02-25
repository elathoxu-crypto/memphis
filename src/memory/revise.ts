import { readFileSync, renameSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { Store } from "./store.js";
import { verifyBlock, validateBlockAgainstSoul, type Block } from "./chain.js";

export interface QuarantineResult {
  chain: string;
  status: "ok" | "fixed" | "broken";
  head: number;
  quarantined: number;
  would_quarantine?: number; // For dry-run: how many would be quarantined
  quarantine_dir?: string;
  errors: string[];
}

export interface ReviseOptions {
  chain?: string;
  dryRun?: boolean;
  json?: boolean;
}

/**
 * Quarantine a block file - move to .quarantine directory
 */
function quarantineFile(chainDir: string, filename: string): string {
  const quarantineDir = join(dirname(chainDir), ".quarantine", chainDir.split("/").pop()!, new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(quarantineDir, { recursive: true, mode: 0o700 });
  
  const src = join(chainDir, filename);
  const dest = join(quarantineDir, filename);
  
  renameSync(src, dest);
  return quarantineDir;
}

/**
 * List block files for a chain (sorted by index)
 */
function listBlockFiles(chainDir: string): string[] {
  if (!existsSync(chainDir)) return [];
  return readdirSync(chainDir)
    .filter(f => f.endsWith(".json"))
    .sort();
}

/**
 * Try to parse a block file, return null if invalid
 */
function parseBlockFile(chainDir: string, filename: string): Block | null {
  try {
    const content = readFileSync(join(chainDir, filename), "utf-8");
    return JSON.parse(content) as Block;
  } catch {
    return null;
  }
}

/**
 * Revise a single chain - detect and quarantine damaged blocks
 */
function reviseChain(store: Store, chain: string, dryRun: boolean): QuarantineResult {
  const chainDir = join(store.getBasePath(), chain);
  const files = listBlockFiles(chainDir);
  
  const result: QuarantineResult = {
    chain,
    status: "ok",
    head: 0,
    quarantined: 0,
    errors: [],
  };

  // Track what would be quarantined in dry-run mode
  let wouldQuarantineCount = 0;
  
  if (files.length === 0) {
    result.head = -1;
    return result;
  }
  
  let lastValidIndex = -1;
  let prevBlock: Block | undefined;
  
  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const block = parseBlockFile(chainDir, filename);
    
    // Check 1: JSON parsing
    if (!block) {
      const error = `Block ${i}: invalid JSON`;
      result.errors.push(error);
      if (!dryRun) {
        quarantineFile(chainDir, filename);
        result.quarantined++;
      } else {
        wouldQuarantineCount++;
      }
      break; // Stop on first error
    }
    
    // Check 2: SOUL validation
    const soulResult = validateBlockAgainstSoul(block, prevBlock);
    if (!soulResult.valid) {
      const error = `Block ${block.index}: SOUL violation - ${soulResult.errors.join("; ")}`;
      result.errors.push(error);
      if (!dryRun) {
        quarantineFile(chainDir, filename);
        result.quarantined++;
      } else {
        wouldQuarantineCount++;
      }
      break;
    }
    
    // Check 3: Hash verification
    if (!verifyBlock(block, prevBlock)) {
      const error = `Block ${block.index}: hash mismatch`;
      result.errors.push(error);
      if (!dryRun) {
        quarantineFile(chainDir, filename);
        result.quarantined++;
      } else {
        wouldQuarantineCount++;
      }
      break;
    }
    
    // Check 4: Index continuity (no gaps)
    const expectedIndex = i;
    if (block.index !== expectedIndex) {
      const error = `Block ${i}: index gap - expected ${expectedIndex}, got ${block.index}`;
      result.errors.push(error);
      break; // Can't continue without gap
    }
    
    lastValidIndex = block.index;
    prevBlock = block;
  }
  
  // Determine status
  if (result.errors.length === 0) {
    result.status = "ok";
    result.head = lastValidIndex;
  } else if (lastValidIndex >= 0 || result.quarantined > 0 || (dryRun && wouldQuarantineCount > 0)) {
    result.status = "fixed";
    result.head = lastValidIndex;
  } else {
    result.status = "broken";
    result.head = -1;
  }
  
  // Set would_quarantine for dry-run mode
  if (dryRun && wouldQuarantineCount > 0) {
    result.would_quarantine = wouldQuarantineCount;
  }
  
  return result;
}

/**
 * Revise all chains or specific chain
 */
export function revise(store: Store, options: ReviseOptions): QuarantineResult[] {
  const chains = options.chain ? [options.chain] : store.listChains();
  const results: QuarantineResult[] = [];
  
  for (const chain of chains) {
    try {
      const result = reviseChain(store, chain, !!options.dryRun);
      results.push(result);
    } catch (err: any) {
      results.push({
        chain,
        status: "broken",
        head: -1,
        quarantined: 0,
        errors: [err.message],
      });
    }
  }
  
  return results;
}
