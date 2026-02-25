export function queryBlocks(store, opts) {
    const chains = opts.chain ? [opts.chain] : store.listChains();
    let results = [];
    for (const chain of chains) {
        const blocks = store.readChain(chain);
        results.push(...blocks);
    }
    if (opts.keyword) {
        const kw = opts.keyword.toLowerCase();
        results = results.filter(b => (b.data.content?.toLowerCase().includes(kw) ?? false) ||
            (b.data.tags?.some(t => t.toLowerCase().includes(kw)) ?? false));
    }
    if (opts.tag) {
        const tag = opts.tag.toLowerCase();
        results = results.filter(b => (b.data.tags?.some(t => t.toLowerCase() === tag) ?? false));
    }
    if (opts.type) {
        results = results.filter(b => b.data.type === opts.type);
    }
    // Sort by timestamp descending (newest first)
    results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (opts.limit) {
        results = results.slice(0, opts.limit);
    }
    return results;
}
//# sourceMappingURL=query.js.map