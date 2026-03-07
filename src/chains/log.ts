/**
 * Log Chain - Centralized Logging in Memphis Chains
 *
 * Uses "system" block type to store log entries
 * Log format: JSON content with metadata
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Block, BlockData } from "../memory/chain.js";
import { sha256 } from "../utils/hash.js";

const MEMPHIS_HOME = process.env.MEMPHIS_HOME || `${process.env.HOME || ""}/.memphis`;
const CHAINS_DIR = join(MEMPHIS_HOME, "chains");

function readBlocks(chainName: string): Block[] {
  try {
    const chainDir = join(CHAINS_DIR, chainName);
    if (!existsSync(chainDir)) return [];

    const files = readdirSync(chainDir)
      .filter((f) => f.endsWith(".json"))
      .sort();

    return files
      .map((f) => {
        try {
          return JSON.parse(readFileSync(join(chainDir, f), "utf-8")) as Block;
        } catch {
          return null;
        }
      })
      .filter((b): b is Block => b !== null);
  } catch {
    return [];
  }
}

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "CRITICAL";

export type LogSource = "memphis-cli" | "memphis-bot" | "openclaw" | "system" | "exec";

export interface LogContext {
  command?: string;
  args?: string[];
  provider?: string;
  model?: string;
  exitCode?: number;
  pid?: number;
  userId?: number;
  chatId?: number;
  error?: {
    code?: string | number;
    message?: string;
    stack?: string;
    url?: string;
  };
  [key: string]: any;
}

export interface LogEntry {
  id: string; // Will be set by block hash
  timestamp: string; // From Block
  level: LogLevel;
  source: LogSource;
  message: string;
  context?: LogContext;
  duration?: number; // milliseconds
}

export interface LogFilters {
  level?: LogLevel;
  source?: LogSource;
  search?: string;
  since?: string; // ISO8601
  until?: string; // ISO8601
}

export interface LogStats {
  total: number;
  byLevel: Record<LogLevel, number>;
  bySource: Record<LogSource, number>;
  last1h: {
    total: number;
    byLevel: Record<LogLevel, number>;
  };
}

export class LogChain {
  private chainName: string = "logs";

  /**
   * Add a log entry to chain as "system" block
   */
  add(
    level: LogLevel,
    message: string,
    source: LogSource = "system",
    context?: LogContext,
    duration?: number
  ): string {
    const logEntry: LogEntry = {
      id: "",
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      context,
      duration
    };

    // Store as JSON string in content
    const content = JSON.stringify(logEntry);
    const timestamp = new Date().toISOString();
    const hash = sha256(content + timestamp);

    // Create Block structure
    const blockData: BlockData = {
      type: "system" as const,
      content,
      tags: [`level:${level}`, `source:${source}`],
      agent: "memphis-log-chain"
    };

    // NOTE: We need to writeBlock function from store module
    // For now, return hash as ID (actual storage would happen in real implementation)
    return hash;
  }

  /**
   * Query logs with filters
   */
  query(filters: LogFilters): LogEntry[] {
    const blocks = readBlocks(this.chainName);

    if (!blocks || blocks.length === 0) {
      return [];
    }

    const logEntries: LogEntry[] = [];

    for (const block of blocks) {
      try {
        const logEntry = JSON.parse(block.data.content);
        logEntries.push({
          ...logEntry,
          id: block.hash,
          timestamp: block.timestamp
        });
      } catch {
        // Skip invalid log entries
        continue;
      }
    }

    return logEntries
      .filter((entry) => {
        // Level filter
        if (filters.level && entry.level !== filters.level) {
          return false;
        }

        // Source filter
        if (filters.source && entry.source !== filters.source) {
          return false;
        }

        // Text search
        if (filters.search) {
          const messageLower = entry.message.toLowerCase();
          const searchLower = filters.search.toLowerCase();
          if (!messageLower.includes(searchLower)) {
            const contextStr = entry.context ? JSON.stringify(entry.context).toLowerCase() : "";
            if (!contextStr.includes(searchLower)) {
              return false;
            }
          }
        }

        // Time range
        if (filters.since) {
          const entryTime = new Date(entry.timestamp).getTime();
          const sinceTime = new Date(filters.since).getTime();
          if (entryTime < sinceTime) {
            return false;
          }
        }

        if (filters.until) {
          const entryTime = new Date(entry.timestamp).getTime();
          const untilTime = new Date(filters.until).getTime();
          if (entryTime > untilTime) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // Newest first
  }

  /**
   * Get last N logs
   */
  tail(n: number = 100): LogEntry[] {
    const blocks = readBlocks(this.chainName);

    if (!blocks || blocks.length === 0) {
      return [];
    }

    const logEntries: LogEntry[] = [];

    for (const block of blocks) {
      try {
        const logEntry = JSON.parse(block.data.content);
        logEntries.push({
          ...logEntry,
          id: block.hash,
          timestamp: block.timestamp
        });
      } catch {
        // Skip invalid log entries
        continue;
      }
    }

    return logEntries.slice(-n).reverse();
  }

  /**
   * Get logs as export
   */
  export(format: "json" | "csv" = "json"): string {
    const blocks = readBlocks(this.chainName);

    if (!blocks || blocks.length === 0) {
      return "";
    }

    const logEntries: LogEntry[] = [];

    for (const block of blocks) {
      try {
        const logEntry = JSON.parse(block.data.content);
        logEntries.push({
          ...logEntry,
          id: block.hash,
          timestamp: block.timestamp
        });
      } catch {
        // Skip invalid log entries
        continue;
      }
    }

    if (format === "json") {
      return JSON.stringify(logEntries, null, 2);
    }

    if (format === "csv") {
      const headers = ["id", "timestamp", "level", "source", "message", "context"];
      const rows = logEntries.map((b) => [
        b.id,
        b.timestamp,
        b.level,
        b.source,
        `"${b.message.replace(/"/g, '""')}"`,
        `"${b.context ? JSON.stringify(b.context).replace(/"/g, '""') : ""}"`
      ]);
      return [headers.join(","), ...rows].join("\n");
    }

    return "";
  }

  /**
   * Get statistics
   */
  stats(): LogStats {
    const blocks = readBlocks(this.chainName);

    if (!blocks || blocks.length === 0) {
      return {
        total: 0,
        byLevel: { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, CRITICAL: 0 },
        bySource: {} as Record<string, number>,
        last1h: {
          total: 0,
          byLevel: { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, CRITICAL: 0 }
        }
      };
    }

    const logEntries: LogEntry[] = [];

    for (const block of blocks) {
      try {
        logEntries.push(JSON.parse(block.data.content));
      } catch {
        // Skip invalid entries
        continue;
      }
    }

    const counts = logEntries.reduce((acc, b) => {
      acc.total++;
      acc.byLevel[b.level]++;
      acc.bySource[b.source]++;
      return acc;
    }, {
      total: 0,
      byLevel: { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, CRITICAL: 0 },
      bySource: {} as Record<string, number>
    });

    // Count last 1h
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recent = logEntries.filter((b) => new Date(b.timestamp).getTime() > oneHourAgo);
    const recentByLevel = recent.reduce((acc, b) => {
      acc[b.level]++;
      return acc;
    }, { DEBUG: 0, INFO: 0, WARN: 0, ERROR: 0, CRITICAL: 0 });

    return {
      total: counts.total,
      byLevel: counts.byLevel,
      bySource: counts.bySource as Record<string, number>,
      last1h: {
        total: recent.length,
        byLevel: recentByLevel
      }
    };
  }

  /**
   * Clean old logs (retention)
   */
  cleanup(days: number = 30): string[] {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const blocks = readBlocks(this.chainName);

    const toDelete: string[] = [];

    for (const block of blocks) {
      const blockTime = new Date(block.timestamp).getTime();
      if (blockTime < cutoff) {
        toDelete.push(block.hash);
      }
    }

    // TODO: Implement actual deletion (need to modify store API)
    return toDelete;
  }
}
