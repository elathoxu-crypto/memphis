import { Store } from "../../memory/store.js";
import { loadConfig } from "../../config/loader.js";
import { queryBlocks } from "../../memory/query.js";
import { log } from "../../utils/logger.js";
import { recallDecisionsV1, formatDecisionOneLiner } from "../../decision/recall-v1.js";
export async function recallCommand(scopeOrKeyword, query, options) {
    const config = loadConfig();
    const store = new Store(config.memory.path);
    // New: decisions recall
    if (scopeOrKeyword === "decisions") {
        const limit = options.limit ? parseInt(options.limit) : 15;
        const results = recallDecisionsV1(store, {
            query,
            limit,
            since: options.since,
            projectOnly: !!options.project,
            allProjects: !!options.all,
        });
        if (results.length === 0) {
            log.warn(`No decisions found${query ? ` for "${query}"` : ""}`);
            return;
        }
        for (const r of results) {
            console.log(formatDecisionOneLiner({
                decision: r.decision,
                timestamp: r.block.timestamp,
                projectLabel: r.projectLabel,
            }));
        }
        return;
    }
    // Default: legacy recall by keyword
    const keyword = scopeOrKeyword;
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