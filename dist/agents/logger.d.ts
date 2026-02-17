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
 * Add entry to buffer (batched)
 */
export declare function agentLog(entry: Omit<AgentLogEntry, "tags">): void;
/**
 * Flush buffer to Memphis chain
 */
export declare function flush(): void;
/**
 * Manual flush (for testing)
 */
export declare function forceFlush(): void;
/**
 * Get buffer status
 */
export declare function getStatus(): {
    buffered: number;
    lastFlush: number;
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
