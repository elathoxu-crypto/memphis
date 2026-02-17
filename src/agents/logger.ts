// Unified Agent Logger - święta trójca agentów
// Format: [AGENT] type:action target → status

import { Store } from "../memory/store.js";
import { loadConfig } from "../config/loader.js";

export type AgentSource = "openclaw" | "cline" | "memphis";
export type LogType = "api" | "file" | "cmd" | "error";

export interface AgentLogEntry {
  source: AgentSource;
  type: LogType;
  action: string;      // e.g., "edit", "read", "exec"
  target: string;       // e.g., "src/index.ts", "api.openai.com"
  status: "ok" | "error" | "pending";
  duration?: number;   // in seconds
  tags: string[];
}

// Buffer for batching - flushed every 5 minutes
const logBuffer: AgentLogEntry[] = [];
let lastFlush = Date.now();
const FLUSH_INTERVAL = 5 * 60 * 1000; // 5 minutes

// In-memory store (singleton)
let storeInstance: Store | null = null;

function getStore(): Store {
  if (!storeInstance) {
    const config = loadConfig();
    storeInstance = new Store(config.memory.path);
  }
  return storeInstance;
}

/**
 * Format entry as compact string
 * [openclaw] file:edit src/index.ts → ok
 */
function formatEntry(entry: AgentLogEntry): string {
  const duration = entry.duration ? ` ${entry.duration}s` : "";
  return `[${entry.source}] ${entry.type}:${entry.action} ${entry.target} → ${entry.status}${duration}`;
}

/**
 * Add entry to buffer (batched)
 */
export function agentLog(entry: Omit<AgentLogEntry, "tags">): void {
  const fullEntry: AgentLogEntry = {
    ...entry,
    tags: ["auto", "agent", entry.source],
  };
  
  logBuffer.push(fullEntry);
  
  // Check if should flush
  const now = Date.now();
  if (now - lastFlush > FLUSH_INTERVAL || logBuffer.length >= 10) {
    flush();
  }
}

/**
 * Flush buffer to Memphis chain
 */
export function flush(): void {
  if (logBuffer.length === 0) return;
  
  const store = getStore();
  const entries = [...logBuffer];
  logBuffer.length = 0;
  lastFlush = Date.now();
  
  // Format as compact batch
  const content = entries.map(formatEntry).join("\n");
  
  store.addBlock("journal", {
    type: "journal",
    content,
    tags: ["auto", "batch", `count:${entries.length}`],
    agent: "agent-logger",
  });
}

/**
 * Manual flush (for testing)
 */
export function forceFlush(): void {
  flush();
}

/**
 * Get buffer status
 */
export function getStatus(): { buffered: number; lastFlush: number } {
  return {
    buffered: logBuffer.length,
    lastFlush,
  };
}

// Auto-flush every 5 minutes
setInterval(flush, FLUSH_INTERVAL);

// Helper functions for each agent
export const openclaw = {
  api: (target: string, status: "ok" | "error", duration?: number) =>
    agentLog({ source: "openclaw", type: "api", action: "call", target, status, duration }),
  file: (action: string, target: string, status: "ok" | "error") =>
    agentLog({ source: "openclaw", type: "file", action, target, status }),
  cmd: (target: string, status: "ok" | "error", duration?: number) =>
    agentLog({ source: "openclaw", type: "cmd", action: "exec", target, status, duration }),
  error: (target: string, details: string) =>
    agentLog({ source: "openclaw", type: "error", action: "fail", target: `${target}: ${details}`, status: "error" }),
};

export const cline = {
  api: (target: string, status: "ok" | "error", duration?: number) =>
    agentLog({ source: "cline", type: "api", action: "call", target, status, duration }),
  file: (action: string, target: string, status: "ok" | "error") =>
    agentLog({ source: "cline", type: "file", action, target, status }),
  cmd: (target: string, status: "ok" | "error", duration?: number) =>
    agentLog({ source: "cline", type: "cmd", action: "exec", target, status, duration }),
  error: (target: string, details: string) =>
    agentLog({ source: "cline", type: "error", action: "fail", target: `${target}: ${details}`, status: "error" }),
};

export const memphis = {
  api: (target: string, status: "ok" | "error", duration?: number) =>
    agentLog({ source: "memphis", type: "api", action: "call", target, status, duration }),
  file: (action: string, target: string, status: "ok" | "error") =>
    agentLog({ source: "memphis", type: "file", action, target, status }),
  cmd: (target: string, status: "ok" | "error", duration?: number) =>
    agentLog({ source: "memphis", type: "cmd", action: "exec", target, status, duration }),
  error: (target: string, details: string) =>
    agentLog({ source: "memphis", type: "error", action: "fail", target: `${target}: ${details}`, status: "error" }),
};
