import { Store } from "../memory/store.js";
import type { Block } from "../memory/chain.js";
import { type DecisionV1 } from "./decision-v1.js";
export interface RecallDecisionsOptions {
    query?: string;
    limit?: number;
    since?: string;
    projectOnly?: boolean;
    allProjects?: boolean;
    cwd?: string;
}
export interface RecalledDecision {
    block: Block;
    decision: DecisionV1;
    score: number;
    projectLabel?: string;
}
export declare function formatDecisionOneLiner(d: {
    decision: DecisionV1;
    timestamp: string;
    projectLabel?: string;
}): string;
export declare function recallDecisionsV1(store: Store, opts?: RecallDecisionsOptions): RecalledDecision[];
