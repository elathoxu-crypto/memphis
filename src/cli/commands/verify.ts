import chalk from "chalk";
import { Store } from "../../memory/store.js";
import { verifyChain, validateBlockAgainstSoul, verifyBlock, type Block } from "../../memory/chain.js";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createWorkspaceStore } from "../utils/workspace-store.js";

export interface VerifyOptions {
  chain?: string;
  json?: boolean;
  verbose?: boolean;
}

/**
 * Verify blocks directly from files (not via readChain which skips invalid)
 */
function verifyChainFiles(store: Store, chain: string): { valid: boolean; broken_at?: number; errors?: string[] } {
  const chainDir = join(store.getBasePath(), chain);
  
  if (!existsSync(chainDir)) {
    return { valid: true };
  }
  
  const files = readdirSync(chainDir).filter(f => f.endsWith(".json")).sort();
  
  if (files.length === 0) {
    return { valid: true };
  }
  
  const errors: string[] = [];
  let prevBlock: Block | undefined;
  
  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    let block: Block;
    
    // Parse JSON directly
    try {
      const content = readFileSync(join(chainDir, filename), "utf-8");
      block = JSON.parse(content);
    } catch (parseErr) {
      errors.push(`Block ${i}: invalid JSON - ${filename}`);
      return { valid: false, broken_at: i, errors };
    }
    
    // SOUL validation
    const soulResult = validateBlockAgainstSoul(block, prevBlock);
    if (!soulResult.valid) {
      errors.push(`Block ${block.index}: SOUL violation - ${soulResult.errors.join("; ")}`);
      return { valid: false, broken_at: i, errors };
    }
    
    // Hash verification
    if (!verifyBlock(block, prevBlock)) {
      errors.push(`Block ${block.index}: hash mismatch`);
      return { valid: false, broken_at: i, errors };
    }
    
    // Index check
    if (block.index !== i) {
      errors.push(`Block ${i}: index mismatch - expected ${i}, got ${block.index}`);
      return { valid: false, broken_at: i, errors };
    }
    
    prevBlock = block;
  }
  
  return { valid: true };
}

export async function verifyCommand(options: VerifyOptions = {}) {
  const { store, guard } = createWorkspaceStore();
  
  // Get chains to verify
  let chains: string[];
  const available = guard.listChains();
  if (options.chain) {
    if (!available.includes(options.chain)) {
      console.log(chalk.red(`Chain '${options.chain}' is not available in the current workspace.`));
      process.exit(1);
    }
    chains = [options.chain];
  } else {
    chains = available;
  }
  
  if (chains.length === 0) {
    if (options.json) {
      console.log(JSON.stringify({ chains: [], valid: true, message: "No chains found" }));
      process.exit(0);
    }
    console.log(chalk.gray("  No chains to verify"));
    process.exit(0);
  }
  
  let allValid = true;
  const results: { chain: string; valid: boolean; blocks: number; broken_at?: number; errors?: string[] }[] = [];
  
  for (const chain of chains) {
    try {
      const verification = verifyChainFiles(store, chain);
      
      // Get block count
      const chainDir = join(store.getBasePath(), chain);
      const files = existsSync(chainDir) 
        ? readdirSync(chainDir).filter(f => f.endsWith(".json")).length 
        : 0;
      
      results.push({ 
        chain, 
        valid: verification.valid, 
        blocks: files,
        broken_at: verification.broken_at,
        errors: verification.errors,
      });
      
      if (!verification.valid) {
        allValid = false;
      }
      
    } catch (err: any) {
      allValid = false;
      results.push({ chain, valid: false, blocks: 0, errors: [err.message] });
    }
  }
  
  // JSON output
  if (options.json) {
    const output = {
      valid: allValid,
      chains: results.map(r => ({
        name: r.chain,
        valid: r.valid,
        blocks: r.blocks,
        broken_at: r.broken_at,
        error_count: r.errors?.length,
      })),
    };
    console.log(JSON.stringify(output));
    process.exit(allValid ? 0 : 1);
  }
  
  // Human-readable output
  console.log(chalk.bold("\n🔍 Memphis Chain Verification\n"));
  
  for (const r of results) {
    if (r.valid) {
      console.log(chalk.green(`  ✓ ${r.chain} (${r.blocks} blocks)`));
    } else {
      console.log(chalk.red(`  ✗ ${r.chain} (${r.blocks} blocks)`));
      if (r.broken_at !== undefined) {
        console.log(chalk.red(`    broken at: block ${r.broken_at}`));
      }
      if (r.errors?.length) {
        console.log(chalk.red(`    errors: ${r.errors.length}`));
        if (options.verbose) {
          r.errors!.slice(0, 5).forEach(e => {
            console.log(chalk.gray(`      - ${e}`));
          });
        }
      }
    }
  }
  
  // Summary
  console.log(chalk.bold("\n📊 Summary:"));
  const validCount = results.filter(r => r.valid).length;
  console.log(`  Valid: ${validCount}/${results.length} chains`);
  
  if (allValid) {
    console.log(chalk.green("\n✅ All chains verified - INTEGRITY OK\n"));
    process.exit(0);
  } else {
    console.log(chalk.red("\n❌ Chain integrity FAILED\n"));
    process.exit(1);
  }
}
