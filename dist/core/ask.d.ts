import { Store } from "../memory/store.js";
import type { Block } from "../memory/chain.js";
export interface AskOptions {
    question: string;
    chain?: string;
    provider?: string;
    includeVault?: boolean;
    topK?: number;
    maxContextChars?: number;
    since?: string;
    tags?: string[];
    noSave?: boolean;
    json?: boolean;
    preferSummaries?: boolean;
    noSummaries?: boolean;
    summariesMax?: number;
    explainContext?: boolean;
}
export interface AskContextHit {
    chain: string;
    index: number;
    timestamp: string;
    type: string;
    tags: string[];
    snippet: string;
    score: number;
}
export interface AskResult {
    answer: string;
    provider: string;
    model: string;
    tokens_used?: number;
    context: {
        hits: AskContextHit[];
    };
    savedBlock?: Block;
}
/**
 * Main ask with context function
 */
export declare function askWithContext(store: Store, opts: AskOptions): Promise<AskResult>;
