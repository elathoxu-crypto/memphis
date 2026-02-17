import type { Block, BlockData } from "./chain.js";
export declare class Store {
    private basePath;
    constructor(basePath: string);
    private chainDir;
    private blockFile;
    getLastBlock(chain: string): Block | undefined;
    addBlock(chain: string, data: BlockData): Block;
    readChain(chain: string): Block[];
    listChains(): string[];
    getChainStats(chain: string): {
        blocks: number;
        first?: string;
        last?: string;
    };
}
