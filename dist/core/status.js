import { verifyChain } from "../memory/chain.js";
/**
 * Build comprehensive status report from store and config (sync)
 */
export function buildStatusReport(store, config) {
    const chains = [];
    const recentBlocks = [];
    // Get all chains
    const chainNames = store.listChains();
    for (const chainName of chainNames) {
        const blocks = store.readChain(chainName);
        const stats = store.getChainStats(chainName);
        let health = "empty";
        let broken_at;
        let soul_errors;
        if (blocks.length > 0) {
            const verification = verifyChain(blocks);
            if (verification.valid) {
                health = "ok";
            }
            else {
                health = "broken";
                broken_at = verification.broken_at;
                soul_errors = verification.soul_errors;
            }
        }
        chains.push({
            name: chainName,
            blocks: stats.blocks,
            first: stats.first,
            last: stats.last,
            health,
            broken_at,
            soul_errors,
        });
        // Get last 5 blocks from this chain for recent activity
        const lastK = blocks.slice(-5);
        for (const block of lastK) {
            recentBlocks.push({
                chain: chainName,
                index: block.index,
                timestamp: block.timestamp,
                type: block.data.type,
                content: block.data.content?.substring(0, 100) || "",
            });
        }
    }
    // Sort recent by timestamp desc, take top 5
    recentBlocks.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const recent = recentBlocks.slice(0, 5);
    // Providers
    const providers = [];
    const providerEntries = Object.entries(config.providers || {});
    for (const [name, p] of providerEntries) {
        let health = "ready";
        let detail;
        const isOllama = name === "ollama";
        const hasKey = p.api_key && p.api_key.length > 0;
        if (isOllama || hasKey) {
            health = "ready";
        }
        else {
            health = "no_key";
            detail = "No API key configured";
        }
        providers.push({
            name,
            model: p.model,
            role: p.role,
            health,
            detail,
        });
    }
    // Vault
    const vaultBlocks = store.readChain("vault");
    let vaultHealth = "ok";
    let vaultDetail;
    if (vaultBlocks.length === 0) {
        vaultHealth = "not_initialized";
        vaultDetail = "Run: memphis vault init";
    }
    const vault = {
        initialized: vaultBlocks.length > 0,
        blocks: vaultBlocks.length,
        health: vaultHealth,
        detail: vaultDetail,
    };
    // Overall OK?
    const allChainsOk = chains.every(c => c.health !== "broken");
    const allProvidersOk = providers.every(p => p.health === "ready");
    const ok = allChainsOk && allProvidersOk;
    return {
        ok,
        chains,
        providers,
        vault,
        recent,
    };
}
//# sourceMappingURL=status.js.map