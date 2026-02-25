export interface BlockData {
    type: "journal" | "build" | "adr" | "ops" | "ask" | "system" | "vault" | "credential" | "decision" | "project_task" | "break_task";
    content: string;
    tags: string[];
    agent?: string;
    provider?: string;
    tokens_used?: number;
    context_refs?: Array<{
        chain: string;
        index: number;
        score: number;
    }>;
    source_ref?: {
        chain: string;
        index: number;
        hash: string;
    };
    decision_status?: "active" | "superseded" | "retracted";
    supersedes?: number;
    summary_version?: string;
    summary_range?: {
        chain: string;
        from: number;
        to: number;
    };
    summary_refs?: Array<{
        chain: string;
        index: number;
        hash: string;
    }>;
    data?: Record<string, unknown>;
    task?: string;
    project?: string;
    description?: string;
    encrypted?: string;
    revoked?: boolean;
    iv?: string;
    key_id?: string;
    schema?: string;
    issuer?: string;
    holder?: string;
    proof?: string;
}
export interface Block {
    index: number;
    timestamp: string;
    chain: string;
    data: BlockData;
    prev_hash: string;
    hash: string;
}
export interface SoulValidationResult {
    valid: boolean;
    errors: string[];
}
/**
 * Validate a block against SOUL rules
 */
export declare function validateBlockAgainstSoul(block: Block, prevBlock?: Block): SoulValidationResult;
export declare function createBlock(chain: string, data: BlockData, prevBlock?: Block): Block;
export declare function verifyBlock(block: Block, prevBlock?: Block): boolean;
export declare function verifyChain(blocks: Block[]): {
    valid: boolean;
    broken_at?: number;
    soul_errors?: string[];
};
