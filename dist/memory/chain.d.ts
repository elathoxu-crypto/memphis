export interface BlockData {
    type: "journal" | "build" | "adr" | "ops" | "ask" | "system" | "vault" | "credential";
    content: string;
    tags: string[];
    agent?: string;
    provider?: string;
    tokens_used?: number;
    encrypted?: string;
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
