import type { Block, BlockData } from "./chain.js";
import { Store } from "./store.js";
export interface SlidingWindowConfig {
    maxBlocks: number;
    summaryThreshold: number;
    minBlocksForSummary: number;
    summaryChain: string;
}
export interface SummaryResult {
    originalCount: number;
    summarizedCount: number;
    summary: string;
    timestamp: string;
}
/**
 * SlidingWindow - Manages context by keeping recent blocks and summarizing old ones
 */
export declare class SlidingWindow {
    private store;
    private config;
    private recentBlocks;
    constructor(store: Store, config?: Partial<SlidingWindowConfig>);
    /**
     * Load recent blocks into memory
     */
    private loadRecentBlocks;
    /**
     * Get the current context (recent blocks)
     */
    getContext(limit?: number): Block[];
    /**
     * Get context as formatted strings for LLM
     */
    getContextAsStrings(limit?: number): string[];
    /**
     * Add a new block and manage sliding window
     */
    addBlock(data: BlockData): Block;
    /**
     * Slide the window - summarize old blocks if needed
     */
    private slide;
    /**
     * Summarize old blocks and store the summary
     */
    private summarizeOldBlocks;
    /**
     * Generate a summary from blocks (simple extractive summarization)
     */
    private generateSummary;
    /**
     * Get summaries from the summary chain
     */
    getSummaries(limit?: number): Block[];
    /**
     * Check if summarization is needed
     */
    needsSummarization(): boolean;
    /**
     * Get statistics about the sliding window
     */
    getStats(): {
        currentBlocks: number;
        maxBlocks: number;
        utilization: number;
        needsSummary: boolean;
    };
    /**
     * Force a slide operation (manual trigger)
     */
    forceSlide(): void;
    /**
     * Reset the sliding window (reload from disk)
     */
    reset(): void;
}
/**
 * ContextManager - Higher-level context management with LLM summarization support
 */
export declare class ContextManager {
    private store;
    private slidingWindow;
    constructor(store: Store, config?: Partial<SlidingWindowConfig>);
    /**
     * Get context for LLM with automatic summarization
     */
    getContextForLLM(maxTokens?: number, summarizer?: (blocks: Block[]) => Promise<string>): Promise<{
        context: string;
        blocks: Block[];
        needsSummary: boolean;
    }>;
    /**
     * Add a new entry to context
     */
    addEntry(content: string, type?: string, tags?: string[]): Block;
    /**
     * Get sliding window statistics
     */
    getStats(): {
        currentBlocks: number;
        maxBlocks: number;
        utilization: number;
        needsSummary: boolean;
    };
    /**
     * Get historical summaries
     */
    getSummaries(limit?: number): Block[];
}
