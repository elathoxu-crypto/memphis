/**
 * Cline Bridge - Exposes Memphis as an MCP server
 *
 * This allows Cline to interact with Memphis memory:
 * - Journal: Record decisions, thoughts, learnings
 * - Recall: Search memory by keyword
 * - Status: Check memory chain health
 * - Ask: Query memory with LLM (future)
 *
 * Usage:
 *   npx tsx src/bridges/cline.ts
 *
 * Or import and use programmatically:
 *   import { MemphisBridge } from './src/bridges/cline.js';
 *   const bridge = new MemphisBridge();
 *   await bridge.journal("Cline analyzed the codebase...");
 */
export interface JournalEntry {
    content: string;
    tags?: string[];
    chain?: string;
}
export interface RecallResult {
    blocks: Array<{
        index: number;
        hash: string;
        timestamp: string;
        data: {
            content: string;
            tags?: string[];
        };
    }>;
    total: number;
}
export interface StatusResult {
    chains: Record<string, {
        blocks: number;
        first?: string;
        last?: string;
        valid: boolean;
    }>;
}
export declare class MemphisBridge {
    private store;
    private config;
    constructor(basePath?: string);
    /**
     * Journal a new entry to memory
     */
    journal(entry: JournalEntry): Promise<{
        index: number;
        hash: string;
    }>;
    /**
     * Search memory by keyword
     */
    recall(keyword: string, options?: {
        chain?: string;
        limit?: number;
    }): Promise<RecallResult>;
    /**
     * Get status of all chains
     */
    status(): Promise<StatusResult>;
    /**
     * Read recent entries from a chain
     */
    readChain(chain: string, limit?: number): Promise<RecallResult>;
    /**
     * Get chain stats
     */
    stats(chain: string): Promise<{
        blocks: number;
        valid: boolean;
    }>;
}
