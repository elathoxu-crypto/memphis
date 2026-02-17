import { Store } from "../../memory/store.js";
import { loadConfig } from "../../config/loader.js";
import { queryBlocks } from "../../memory/query.js";
import { log } from "../../utils/logger.js";
export async function askCommand(question) {
    const config = loadConfig();
    const store = new Store(config.memory.path);
    // For now: search memory and display results
    // Later: send to LLM with context
    const keywords = question.toLowerCase().split(/\s+/);
    let results = [];
    for (const kw of keywords) {
        if (kw.length < 3)
            continue;
        const found = queryBlocks(store, { keyword: kw, limit: 5 });
        results.push(...found);
    }
    // Deduplicate by hash
    const seen = new Set();
    results = results.filter(b => {
        if (seen.has(b.hash))
            return false;
        seen.add(b.hash);
        return true;
    });
    if (results.length === 0) {
        log.warn("No relevant blocks found in memory.");
        log.info("Tip: add context with 'memphis journal \"...\"'");
        return;
    }
    log.info(`Found ${results.length} relevant blocks:`);
    for (const block of results.slice(0, 10)) {
        console.log();
        log.block(block.chain, block.index, block.hash);
        console.log(`  ${block.data.content.slice(0, 200)}`);
        if (block.data.tags.length > 0) {
            console.log(`  tags: ${block.data.tags.join(", ")}`);
        }
    }
}
//# sourceMappingURL=ask.js.map