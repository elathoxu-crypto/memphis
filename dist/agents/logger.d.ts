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
/**
 * Add entry - writes directly to chain (no batching)
 * For high-frequency logging, consider external batching
 */
export declare function agentLog(entry: Omit<AgentLogEntry, "tags">): void;
/**
 * Get status
 */
export declare function getStatus(): {
    active: boolean;
};
export declare const openclaw: {
    api: (target: string, status: "ok" | "error", duration?: number) => void;
    file: (action: string, target: string, status: "ok" | "error") => void;
    cmd: (target: string, status: "ok" | "error", duration?: number) => void;
    error: (target: string, details: string) => void;
};
export declare const cline: {
    api: (target: string, status: "ok" | "error", duration?: number) => void;
    file: (action: string, target: string, status: "ok" | "error") => void;
    cmd: (target: string, status: "ok" | "error", duration?: number) => void;
    error: (target: string, details: string) => void;
};
export declare const memphis: {
    api: (target: string, status: "ok" | "error", duration?: number) => void;
    file: (action: string, target: string, status: "ok" | "error") => void;
    cmd: (target: string, status: "ok" | "error", duration?: number) => void;
    error: (target: string, details: string) => void;
};
