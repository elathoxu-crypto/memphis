/**
 * Cline Bridge - Exposes Memphis as an MCP server
 *
 * This allows Cline to interact with Memphis memory:
 * - Journal: Record decisions, thoughts, learnings
 * - Recall: Search memory by keyword
 * - Status: Check memory chain health
 * - Ask: Query memory with LLM (future)
 *
 * Usage:
 *   npx tsx src/bridges/cline.ts
 *
 * Or import and use programmatically:
 *   import { MemphisBridge } from './src/bridges/cline.js';
 *   const bridge = new MemphisBridge();
 *   await bridge.journal("Cline analyzed the codebase...");
 */
import { Store } from "../memory/store.js";
import { loadConfig } from "../config/loader.js";
import { verifyChain } from "../memory/chain.js";
import { queryBlocks } from "../memory/query.js";
export class MemphisBridge {
    store;
    config;
    constructor(basePath) {
        this.config = loadConfig();
        this.store = new Store(basePath ?? this.config.memory.path);
    }
    /**
     * Journal a new entry to memory
     */
    async journal(entry) {
        const chain = entry.chain ?? "journal";
        const block = this.store.addBlock(chain, {
            type: "journal",
            content: entry.content,
            tags: entry.tags ?? [],
            agent: "cline",
        });
        return { index: block.index, hash: block.hash };
    }
    /**
     * Search memory by keyword
     */
    async recall(keyword, options = {}) {
        const chain = options.chain ?? "journal";
        const limit = options.limit ?? 10;
        const blocks = this.store.readChain(chain);
        const results = queryBlocks(this.store, { chain, keyword, limit });
        return {
            blocks: results.map(b => ({
                index: b.index,
                hash: b.hash,
                timestamp: b.timestamp,
                data: {
                    content: b.data.content,
                    tags: b.data.tags,
                },
            })),
            total: results.length,
        };
    }
    /**
     * Get status of all chains
     */
    async status() {
        const chains = this.store.listChains();
        const result = {};
        for (const chain of chains) {
            const blocks = this.store.readChain(chain);
            const stats = this.store.getChainStats(chain);
            const { valid } = verifyChain(blocks);
            result[chain] = {
                blocks: stats.blocks,
                first: stats.first,
                last: stats.last,
                valid,
            };
        }
        return { chains: result };
    }
    /**
     * Read recent entries from a chain
     */
    async readChain(chain, limit = 10) {
        const blocks = this.store.readChain(chain);
        const recent = blocks.slice(-limit).reverse();
        return {
            blocks: recent.map(b => ({
                index: b.index,
                hash: b.hash,
                timestamp: b.timestamp,
                data: {
                    content: b.data.content,
                    tags: b.data.tags,
                },
            })),
            total: blocks.length,
        };
    }
    /**
     * Get chain stats
     */
    async stats(chain) {
        const blocks = this.store.readChain(chain);
        const { valid } = verifyChain(blocks);
        return { blocks: blocks.length, valid };
    }
}
// CLI for standalone testing
async function main() {
    const bridge = new MemphisBridge();
    // Check if initialized
    const status = await bridge.status();
    const chainNames = Object.keys(status.chains);
    if (chainNames.length === 0) {
        console.log("❌ Memphis not initialized. Run: npx tsx src/cli/index.ts init");
        process.exit(1);
    }
    const args = process.argv.slice(2);
    const command = args[0];
    if (command === "journal") {
        const content = args.slice(1).join(" ");
        const result = await bridge.journal({ content });
        console.log(`✅ Journaled: index=${result.index}, hash=${result.hash}`);
    }
    else if (command === "recall") {
        const keyword = args[1];
        const results = await bridge.recall(keyword);
        console.log(`Found ${results.total} results:`);
        for (const block of results.blocks) {
            console.log(`  [${block.index}] ${block.data.content.slice(0, 80)}`);
        }
    }
    else if (command === "status") {
        const status = await bridge.status();
        console.log("Chains:", JSON.stringify(status, null, 2));
    }
    else if (command === "read") {
        const chain = args[1] ?? "journal";
        const results = await bridge.readChain(chain);
        console.log(`Recent ${results.blocks.length} entries from ${chain}:`);
        for (const block of results.blocks) {
            console.log(`  [${block.index}] ${block.data.content}`);
        }
    }
    else {
        console.log(`
Memphis Bridge CLI

Usage:
  npx tsx src/bridges/cline.ts journal <content>
  npx tsx src/bridges/cline.ts recall <keyword>
  npx tsx src/bridges/cline.ts status
  npx tsx src/bridges/cline.ts read [chain]

Examples:
  npx tsx src/bridges/cline.ts journal "Analyzed src/utils - found 5 hash functions"
  npx tsx src/bridges/cline.ts recall "hash"
  npx tsx src/bridges/cline.ts read journal
`);
    }
}
main();
//# sourceMappingURL=cline.js.map