import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createBlock } from "./chain.js";
export class StoreError extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
        this.name = "StoreError";
    }
}
export class Store {
    basePath;
    constructor(basePath) {
        this.basePath = basePath;
        try {
            mkdirSync(basePath, { recursive: true, mode: 0o700 });
        }
        catch (err) {
            throw new StoreError(`Failed to create store directory: ${err}`, "DIR_CREATE_FAILED");
        }
    }
    chainDir(chain) {
        const dir = join(this.basePath, chain);
        try {
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true, mode: 0o700 });
            }
        }
        catch (err) {
            throw new StoreError(`Failed to create chain directory: ${err}`, "CHAIN_DIR_FAILED");
        }
        return dir;
    }
    blockFile(chain, index) {
        return join(this.chainDir(chain), `${String(index).padStart(6, "0")}.json`);
    }
    getLastBlock(chain) {
        try {
            const dir = this.chainDir(chain);
            const files = readdirSync(dir).filter(f => f.endsWith(".json")).sort();
            if (files.length === 0)
                return undefined;
            const last = files[files.length - 1];
            return JSON.parse(readFileSync(join(dir, last), "utf-8"));
        }
        catch (err) {
            if (err.code === "ENOENT")
                return undefined;
            throw new StoreError(`Failed to read last block: ${err}`, "READ_LAST_BLOCK_FAILED");
        }
    }
    addBlock(chain, data) {
        try {
            const prev = this.getLastBlock(chain);
            const block = createBlock(chain, data, prev);
            const file = this.blockFile(chain, block.index);
            const mode = (chain === "vault" || chain === "credential") ? 0o600 : 0o644;
            writeFileSync(file, JSON.stringify(block, null, 2), { encoding: "utf-8", mode });
            return block;
        }
        catch (err) {
            if (err instanceof StoreError)
                throw err;
            throw new StoreError(`Failed to add block: ${err}`, "ADD_BLOCK_FAILED");
        }
    }
    readChain(chain) {
        try {
            const dir = this.chainDir(chain);
            if (!existsSync(dir))
                return [];
            const files = readdirSync(dir).filter(f => f.endsWith(".json")).sort();
            return files.map(f => {
                try {
                    return JSON.parse(readFileSync(join(dir, f), "utf-8"));
                }
                catch (parseErr) {
                    console.warn(`Warning: Failed to parse block file ${f}: ${parseErr}`);
                    return null;
                }
            }).filter((b) => b !== null);
        }
        catch (err) {
            if (err.code === "ENOENT")
                return [];
            throw new StoreError(`Failed to read chain: ${err}`, "READ_CHAIN_FAILED");
        }
    }
    listChains() {
        try {
            if (!existsSync(this.basePath))
                return [];
            return readdirSync(this.basePath, { withFileTypes: true })
                .filter(d => d.isDirectory())
                .map(d => d.name);
        }
        catch (err) {
            if (err.code === "ENOENT")
                return [];
            throw new StoreError(`Failed to list chains: ${err}`, "LIST_CHAINS_FAILED");
        }
    }
    getChainStats(chain) {
        try {
            const blocks = this.readChain(chain);
            return {
                blocks: blocks.length,
                first: blocks[0]?.timestamp,
                last: blocks[blocks.length - 1]?.timestamp,
            };
        }
        catch (err) {
            throw new StoreError(`Failed to get chain stats: ${err}`, "STATS_FAILED");
        }
    }
}
//# sourceMappingURL=store.js.map