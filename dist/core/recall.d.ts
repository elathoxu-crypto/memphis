import { Store } from "../memory/store.js";
export interface RecallQuery {
    text?: string;
    chain?: string;
    type?: string;
    tag?: string;
    since?: string;
    until?: string;
    limit?: number;
    includeVault?: boolean;
}
export interface RecallHit {
    chain: string;
    index: number;
    timestamp: string;
    type: string;
    tags: string[];
    score: number;
    snippet: string;
    content: string;
}
export interface RecallResult {
    query: RecallQuery;
    hits: RecallHit[];
}
/**
 * Build recall result from query
 */
export declare function recall(store: Store, query: RecallQuery): RecallResult;
