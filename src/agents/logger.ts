// Unified Agent Logger - święta trójca agentów
// Format: [AGENT] type:action target → status

import { Store } from "../memory/store.js";
import { loadConfig } from "../config/loader.js";

export type AgentSource = "openclaw" | "cline" | "memphis";
export type LogType = "api" | "file" | "cmd" | "error";

export interface AgentLogEntry {
  source: AgentSource;
  type: LogType;
  action: string;
  target: string;
  status: "ok" | "error" | "pending";
  duration?: number;
  tags: string[];
}

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
 * Add entry - writes directly to chain (no batching)
 * For high-frequency logging, consider external batching
 */
export function agentLog(entry: Omit<AgentLogEntry, "tags">): void {
  const fullEntry: AgentLogEntry = {
    ...entry,
    tags: ["auto", "agent", entry.source],
  };
  
  const store = getStore();
  const content = formatEntry(fullEntry);
  
  // Fire-and-forget — logging must not block callers
  store.appendBlock("journal", {
    type: "journal",
    content,
    tags: fullEntry.tags,
    agent: "agent-logger",
  }).catch(() => { /* non-fatal */ });
}

/**
 * Get status
 */
export function getStatus(): { active: boolean } {
  return { active: true };
}

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
