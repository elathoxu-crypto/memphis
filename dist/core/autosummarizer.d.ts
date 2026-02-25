import { Store } from "../memory/store.js";
import type { Block } from "../memory/chain.js";
export interface SummaryOptions {
    triggerBlocks?: number;
    chain?: string;
    useLLM?: boolean;
    provider?: string;
    dryRun?: boolean;
}
export interface SummaryResult {
    block?: Block;
    summary: {
        version: string;
        range: {
            chain: string;
            from: number;
            to: number;
        };
        stats: {
            journal: number;
            ask: number;
            decisions: number;
        };
        decisions: Array<{
            index: number;
            title: string;
        }>;
        topTags: Array<{
            tag: string;
            count: number;
        }>;
        highlights: string[];
        refs: Array<{
            chain: string;
            index: number;
            hash: string;
        }>;
    };
}
/**
 * Get last summary block to find where we left off
 */
export declare function getLastSummaryMarker(store: Store): {
    chain: string;
    fromIndex: number;
    toIndex: number;
} | undefined;
/**
 * Main autosummarizer function
 */
export declare function autosummarize(store: Store, opts?: SummaryOptions): Promise<SummaryResult>;
/**
 * Check if autosummary should run (for hook integration)
 */
export declare function shouldTriggerAutosummary(store: Store, threshold?: number): boolean;
