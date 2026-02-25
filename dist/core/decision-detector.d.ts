import { Store } from "../memory/store.js";
import type { Block } from "../memory/chain.js";
export interface DecisionResult {
    isDecision: boolean;
    title?: string;
    decision?: string;
    rationale?: string;
    confidence: number;
    tags?: string[];
}
/**
 * Main decision detection function
 */
export declare function detectDecision(store: Store, input: {
    content: string;
    type: string;
    tags?: string[];
}, options?: {
    useLLM?: boolean;
    provider?: string;
    threshold?: number;
}): Promise<DecisionResult>;
/**
 * Save decision to decision chain
 */
export declare function saveDecision(store: Store, sourceBlock: Block, detection: DecisionResult): Promise<Block | undefined>;
/**
 * Hook: check and save decision after block save
 * Returns the decision block if one was created
 */
export declare function checkAndSaveDecision(store: Store, block: Block): Promise<Block | undefined>;
