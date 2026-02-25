import type { Block, BlockData } from "./chain.js";
export declare class StoreError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
export declare class Store {
    private basePath;
    constructor(basePath: string);
    getBasePath(): string;
    private chainDir;
    private blockFile;
    getLastBlock(chain: string): Block | undefined;
    /**
     * Unified appendBlock - the ONLY write path for Memphis
     *
     * Features:
     * - SOUL validation (strict)
     * - Atomic write (crash-safe)
     * - Optional git auto-commit
     *
     * This is the ONLY way to write blocks to chain.
     */
    appendBlock(chain: string, data: BlockData): Promise<Block>;
    /**
     * DEPRECATED: Use appendBlock() instead
     * Kept for backward compatibility during migration
     */
    addBlock(chain: string, data: BlockData): Block;
    readChain(chain: string): Block[];
    listChains(): string[];
    getChainStats(chain: string): {
        blocks: number;
        first?: string;
        last?: string;
    };
}
