// Unified Agent Logger - święta trójca agentów
// Format: [AGENT] type:action target → status
import { Store } from "../memory/store.js";
import { loadConfig } from "../config/loader.js";
// In-memory store (singleton)
let storeInstance = null;
function getStore() {
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
function formatEntry(entry) {
    const duration = entry.duration ? ` ${entry.duration}s` : "";
    return `[${entry.source}] ${entry.type}:${entry.action} ${entry.target} → ${entry.status}${duration}`;
}
/**
 * Add entry - writes directly to chain (no batching)
 * For high-frequency logging, consider external batching
 */
export function agentLog(entry) {
    const fullEntry = {
        ...entry,
        tags: ["auto", "agent", entry.source],
    };
    const store = getStore();
    const content = formatEntry(fullEntry);
    store.addBlock("journal", {
        type: "journal",
        content,
        tags: fullEntry.tags,
        agent: "agent-logger",
    });
}
/**
 * Get status
 */
export function getStatus() {
    return { active: true };
}
// Helper functions for each agent
export const openclaw = {
    api: (target, status, duration) => agentLog({ source: "openclaw", type: "api", action: "call", target, status, duration }),
    file: (action, target, status) => agentLog({ source: "openclaw", type: "file", action, target, status }),
    cmd: (target, status, duration) => agentLog({ source: "openclaw", type: "cmd", action: "exec", target, status, duration }),
    error: (target, details) => agentLog({ source: "openclaw", type: "error", action: "fail", target: `${target}: ${details}`, status: "error" }),
};
export const cline = {
    api: (target, status, duration) => agentLog({ source: "cline", type: "api", action: "call", target, status, duration }),
    file: (action, target, status) => agentLog({ source: "cline", type: "file", action, target, status }),
    cmd: (target, status, duration) => agentLog({ source: "cline", type: "cmd", action: "exec", target, status, duration }),
    error: (target, details) => agentLog({ source: "cline", type: "error", action: "fail", target: `${target}: ${details}`, status: "error" }),
};
export const memphis = {
    api: (target, status, duration) => agentLog({ source: "memphis", type: "api", action: "call", target, status, duration }),
    file: (action, target, status) => agentLog({ source: "memphis", type: "file", action, target, status }),
    cmd: (target, status, duration) => agentLog({ source: "memphis", type: "cmd", action: "exec", target, status, duration }),
    error: (target, details) => agentLog({ source: "memphis", type: "error", action: "fail", target: `${target}: ${details}`, status: "error" }),
};
//# sourceMappingURL=logger.js.map