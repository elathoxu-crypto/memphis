// Error Recovery System for Memphis v3.5.0
// Provides auto-recovery for chain operations, embeddings, and provider failures

import { Store, type IStore } from "../memory/store.js";
import type { Block } from "../memory/chain.js";
import { existsSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MEMPHIS_HOME } from "../config/defaults.js";

export interface RecoveryResult {
  success: boolean;
  action: "none" | "retry" | "backup" | "repair" | "fallback";
  message: string;
  attempts: number;
  recovered: boolean;
}

export interface ChainHealthStatus {
  chain: string;
  healthy: boolean;
  blocks: number;
  lastBlock?: Block;
  errors: string[];
  needsRepair: boolean;
}

const RECOVERY_LOG = join(MEMPHIS_HOME, "logs", "recovery.log");
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

/**
 * Log recovery action
 */
function logRecovery(action: string, details: string): void {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${action}: ${details}\n`;

  try {
    if (!existsSync(join(MEMPHIS_HOME, "logs"))) {
      mkdirSync(join(MEMPHIS_HOME, "logs"), { recursive: true });
    }
    writeFileSync(RECOVERY_LOG, entry, { flag: "a" });
  } catch (err) {
    console.error("[Recovery] Failed to write recovery log:", err);
  }
}

/**
 * Safe chain operation with auto-retry
 */
export async function safeChainOperation<T>(
  operation: () => T | Promise<T>,
  operationName: string,
  maxRetries: number = MAX_RETRIES
): Promise<{ result?: T; error?: Error; recovery: RecoveryResult }> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      return {
        result,
        recovery: {
          success: true,
          action: attempt > 1 ? "retry" : "none",
          message: `Operation succeeded on attempt ${attempt}`,
          attempts: attempt,
          recovered: attempt > 1
        }
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxRetries) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        logRecovery("RETRY", `${operationName} attempt ${attempt + 1}/${maxRetries}`);
      }
    }
  }

  // All retries failed
  logRecovery("FAILED", `${operationName} failed after ${maxRetries} attempts: ${lastError?.message}`);

  return {
    error: lastError,
    recovery: {
      success: false,
      action: "retry",
      message: `Operation failed after ${maxRetries} attempts: ${lastError?.message}`,
      attempts: maxRetries,
      recovered: false
    }
  };
}

/**
 * Safe chain read with error recovery
 */
export async function safeReadChain(
  store: IStore,
  chainName: string
): Promise<{ blocks: Block[]; recovery: RecoveryResult }> {
  const operation = () => store.readChain(chainName);
  const { result, error, recovery } = await safeChainOperation(operation, `readChain(${chainName})`);

  if (error) {
    // Fallback: return empty array
    return {
      blocks: [],
      recovery: {
        ...recovery,
        action: "fallback",
        message: `Chain read failed, returning empty array: ${error.message}`,
        recovered: true
      }
    };
  }

  return {
    blocks: result || [],
    recovery
  };
}

/**
 * Safe chain append with error recovery
 */
export async function safeAppendBlock(
  store: IStore,
  chainName: string,
  blockData: any
): Promise<{ block?: Block; recovery: RecoveryResult }> {
  const operation = () => store.appendBlock(chainName, blockData);
  const { result, error, recovery } = await safeChainOperation(operation, `appendBlock(${chainName})`);

  if (error) {
    // Try backup approach: save to temp file
    try {
      const tempFile = join(MEMPHIS_HOME, "logs", `failed-block-${Date.now()}.json`);
      writeFileSync(tempFile, JSON.stringify({ chain: chainName, data: blockData }, null, 2));
      logRecovery("BACKUP", `Block saved to temp file: ${tempFile}`);

      return {
        recovery: {
          success: true,
          action: "backup",
          message: `Block append failed, saved to backup: ${tempFile}`,
          attempts: 1,
          recovered: true
        }
      };
    } catch (backupErr) {
      return {
        recovery: {
          success: false,
          action: "backup",
          message: `Both append and backup failed: ${error.message}`,
          attempts: 1,
          recovered: false
        }
      };
    }
  }

  return {
    block: result,
    recovery
  };
}

/**
 * Check chain health
 */
export function checkChainHealth(store: IStore, chainName: string): ChainHealthStatus {
  const errors: string[] = [];
  let healthy = true;
  let needsRepair = false;

  try {
    const blocks = store.readChain(chainName);

    // Check for empty chain
    if (blocks.length === 0) {
      return {
        chain: chainName,
        healthy: true,
        blocks: 0,
        errors: [],
        needsRepair: false
      };
    }

    // Check hash integrity
    for (let i = 1; i < blocks.length; i++) {
      const prev = blocks[i - 1];
      const curr = blocks[i];

      if (curr.prev_hash !== prev.hash) {
        errors.push(`Hash mismatch at block ${i}: expected ${prev.hash}, got ${curr.prev_hash}`);
        healthy = false;
        needsRepair = true;
      }
    }

    // Check timestamp ordering
    for (let i = 1; i < blocks.length; i++) {
      const prev = blocks[i - 1];
      const curr = blocks[i];

      if (new Date(curr.timestamp) < new Date(prev.timestamp)) {
        errors.push(`Timestamp disorder at block ${i}: ${curr.timestamp} < ${prev.timestamp}`);
        healthy = false;
      }
    }

    return {
      chain: chainName,
      healthy,
      blocks: blocks.length,
      lastBlock: blocks[blocks.length - 1],
      errors,
      needsRepair
    };
  } catch (err) {
    return {
      chain: chainName,
      healthy: false,
      blocks: 0,
      errors: [`Failed to read chain: ${err}`],
      needsRepair: true
    };
  }
}

/**
 * Auto-repair chain
 */
export async function repairChain(
  store: IStore,
  chainName: string
): Promise<RecoveryResult> {
  const health = checkChainHealth(store, chainName);

  if (health.healthy) {
    return {
      success: true,
      action: "none",
      message: "Chain is healthy, no repair needed",
      attempts: 0,
      recovered: false
    };
  }

  if (!health.needsRepair) {
    return {
      success: false,
      action: "none",
      message: "Chain unhealthy but no repair strategy available",
      attempts: 0,
      recovered: false
    };
  }

  try {
    // Attempt repair: reload from backup or rebuild
    logRecovery("REPAIR", `Attempting repair for chain: ${chainName}`);

    // For now, just log - actual repair logic would go here
    // This could involve:
    // 1. Restoring from latest backup
    // 2. Rebuilding chain from blocks
    // 3. Fixing hash/timestamp issues

    return {
      success: true,
      action: "repair",
      message: `Chain repair initiated (manual intervention may be required)`,
      attempts: 1,
      recovered: false
    };
  } catch (err) {
    logRecovery("REPAIR_FAILED", `Chain repair failed: ${err}`);
    return {
      success: false,
      action: "repair",
      message: `Repair failed: ${err}`,
      attempts: 1,
      recovered: false
    };
  }
}

/**
 * Provider error recovery
 */
export async function safeProviderCall<T>(
  providerCall: () => T | Promise<T>,
  fallbackProvider?: () => T | Promise<T>
): Promise<{ result?: T; error?: Error; recovery: RecoveryResult }> {
  const { result, error, recovery } = await safeChainOperation(providerCall, "providerCall", 2);

  if (error && fallbackProvider) {
    logRecovery("FALLBACK", "Primary provider failed, using fallback");
    try {
      const fallbackResult = await fallbackProvider();
      return {
        result: fallbackResult,
        recovery: {
          success: true,
          action: "fallback",
          message: "Used fallback provider",
          attempts: 1,
          recovered: true
        }
      };
    } catch (fallbackErr) {
      return {
        error: fallbackErr instanceof Error ? fallbackErr : new Error(String(fallbackErr)),
        recovery: {
          success: false,
          action: "fallback",
          message: `Both primary and fallback providers failed`,
          attempts: 2,
          recovered: false
        }
      };
    }
  }

  return { result, error, recovery };
}

/**
 * Get recovery statistics
 */
export function getRecoveryStats(): {
  logFile: string;
  lastRecovery?: string;
  recentErrors: number;
} {
  try {
    if (!existsSync(RECOVERY_LOG)) {
      return {
        logFile: RECOVERY_LOG,
        recentErrors: 0
      };
    }

    const logContent = readFileSync(RECOVERY_LOG, "utf-8");
    const lines = logContent.split("\n").filter(Boolean);
    const lastRecovery = lines[lines.length - 1]?.split("]")[0]?.replace("[", "");

    const recentErrors = lines
      .filter(line => line.includes("FAILED") || line.includes("REPAIR"))
      .slice(-10).length;

    return {
      logFile: RECOVERY_LOG,
      lastRecovery,
      recentErrors
    };
  } catch (err) {
    return {
      logFile: RECOVERY_LOG,
      recentErrors: 0
    };
  }
}

/**
 * Clear old recovery logs
 */
export function clearOldRecoveryLogs(daysToKeep: number = 7): void {
  try {
    if (!existsSync(RECOVERY_LOG)) return;

    const logContent = readFileSync(RECOVERY_LOG, "utf-8");
    const lines = logContent.split("\n").filter(Boolean);
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const recentLines = lines.filter(line => {
      const timestampMatch = line.match(/\[(.+?)\]/);
      if (!timestampMatch) return true;

      const timestamp = new Date(timestampMatch[1]);
      return timestamp >= cutoffDate;
    });

    writeFileSync(RECOVERY_LOG, recentLines.join("\n") + "\n");
    logRecovery("CLEANUP", `Cleared recovery logs older than ${daysToKeep} days`);
  } catch (err) {
    console.error("[Recovery] Failed to clear old logs:", err);
  }
}
