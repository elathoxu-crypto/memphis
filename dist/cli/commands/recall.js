import { Store } from "../../memory/store.js";
import { loadConfig } from "../../config/loader.js";
import { queryBlocks } from "../../memory/query.js";
import { log } from "../../utils/logger.js";
export async function recallCommand(keyword, options) {
    const config = loadConfig();
    const store = new Store(config.memory.path);
    const results = queryBlocks(store, {
        keyword,
        chain: options.chain,
        tag: options.tag,
        limit: options.limit ? parseInt(options.limit) : 20,
    });
    if (results.length === 0) {
        log.warn(`Nothing found for "${keyword}"`);
        return;
    }
    log.info(`${results.length} blocks matching "${keyword}":`);
    for (const block of results) {
        console.log();
        log.block(block.chain, block.index, block.hash);
        console.log(`  ${block.timestamp}`);
        console.log(`  ${block.data.content.slice(0, 300)}`);
        if (block.data.tags.length > 0) {
            console.log(`  tags: ${block.data.tags.join(", ")}`);
        }
    }
}
//# sourceMappingURL=recall.js.map