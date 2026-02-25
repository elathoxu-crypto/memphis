import { loadConfig } from "../config/loader.js";
import { OllamaProvider } from "../providers/ollama.js";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
/**
 * Get lock for autosummarizer
 */
function acquireLock(store) {
    const lockPath = `${store.getBasePath()}/.locks`;
    const lockFile = `${lockPath}/autosummarize.lock`;
    try {
        if (!existsSync(lockPath)) {
            mkdirSync(lockPath, { recursive: true });
        }
        // Simple lock: if file exists, already locked
        if (existsSync(lockFile)) {
            return false;
        }
        writeFileSync(lockFile, `${Date.now()}`);
        return true;
    }
    catch (e) {
        console.error('[DEBUG] Lock error:', e.message);
        return false;
    }
}
function releaseLock(store) {
    const lockFile = `${store.getBasePath()}/.locks/autosummarize.lock`;
    try {
        unlinkSync(lockFile);
    }
    catch {
        // ignore
    }
}
/**
 * Get last summary block to find where we left off
 */
export function getLastSummaryMarker(store) {
    const summaries = store.readChain("summary");
    if (summaries.length === 0)
        return undefined;
    const last = summaries[summaries.length - 1];
    const range = last.data.summary_range;
    // Handle both old format (from/to) and new format
    if (range) {
        // If from is -1, it means "from beginning" - convert to 0
        const from = range.from < 0 ? 0 : range.from;
        return {
            chain: range.chain || "journal",
            fromIndex: from,
            toIndex: range.to ?? from,
        };
    }
    return undefined;
}
/**
 * Count blocks in chains since index (inclusive)
 */
function countBlocksSince(store, chain, sinceIndex) {
    const blocks = store.readChain(chain);
    return blocks.filter(b => b.index >= sinceIndex).length;
}
/**
 * Get blocks to summarize
 */
function getBlocksToSummarize(store, chains, fromIndex, limit) {
    const all = [];
    for (const chain of chains) {
        const blocks = store.readChain(chain);
        const relevant = blocks
            .filter(b => b.index >= fromIndex) // blocks from last summary (inclusive)
            .sort((a, b) => a.index - b.index) // oldest first
            .slice(-limit); // take last N
        all.push(...relevant);
    }
    // Sort by index, take last limit
    all.sort((a, b) => a.index - b.index);
    return all.slice(-limit);
}
/**
 * Extract decisions from blocks
 */
function extractDecisions(blocks) {
    const decisions = blocks
        .filter(b => b.data.type === "decision" || b.data.tags?.includes("decision"))
        .slice(-10); // last 10 decisions
    return decisions.map(d => {
        const title = d.data.content?.split("\n")[0]?.replace(/^#\s*/, "").substring(0, 60) || "Bez tytułu";
        return { index: d.index, title };
    });
}
/**
 * Count top tags
 */
function countTopTags(blocks) {
    const tagCounts = {};
    for (const block of blocks) {
        for (const tag of block.data.tags || []) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
    }
    return Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));
}
/**
 * Extract highlights (first sentence from recent journals)
 */
function extractHighlights(blocks) {
    return blocks
        .filter(b => b.data.type === "journal")
        .slice(-10)
        .map(b => {
        const content = b.data.content || "";
        // First sentence
        const match = content.match(/^[^.!?]*[.!?]/);
        return match ? match[0].substring(0, 100) : content.substring(0, 100);
    });
}
/**
 * Build deterministic summary (Level 1)
 */
function buildDeterministicSummary(blocks, fromIndex, toIndex) {
    const journalBlocks = blocks.filter(b => b.data.type === "journal");
    const askBlocks = blocks.filter(b => b.data.type === "ask");
    const decisions = extractDecisions(blocks);
    const topTags = countTopTags(blocks);
    const highlights = extractHighlights(blocks);
    // Build refs
    const refs = blocks.map(b => ({
        chain: b.chain,
        index: b.index,
        hash: b.hash,
    }));
    return {
        version: "v1",
        range: {
            chain: "journal+ask",
            from: fromIndex,
            to: toIndex,
        },
        stats: {
            journal: journalBlocks.length,
            ask: askBlocks.length,
            decisions: decisions.length,
        },
        decisions,
        topTags,
        highlights,
        refs,
    };
}
/**
 * Build LLM summary (Level 2) - optional
 */
async function buildLLMSummary(blocks, deterministic) {
    const config = loadConfig();
    // Try to find provider
    let provider;
    let model;
    const ollama = new OllamaProvider();
    if (ollama.isConfigured()) {
        provider = ollama;
        model = config.providers?.ollama?.model || "llama3.1";
    }
    else {
        return undefined; // No LLM available
    }
    // Build context
    const content = blocks
        .slice(-30) // last 30 blocks for context
        .map(b => `[${b.chain}#${b.index}] ${b.data.content?.substring(0, 200)}`)
        .join("\n\n");
    const messages = [
        {
            role: "system",
            content: `You are a helpful assistant that summarizes journal entries. 
Create a brief (3-5 bullet points) summary of the recent entries.
Do NOT invent facts. Only summarize what you see.
Use the format: - Bullet point`
        },
        {
            role: "user",
            content: `Recent entries:\n\n${content}\n\nProvide a brief summary:`
        }
    ];
    try {
        const response = await provider.chat(messages, { model, temperature: 0.5 });
        return response.content;
    }
    catch (err) {
        console.error("LLM summary failed:", err);
        return undefined;
    }
}
/**
 * Main autosummarizer function
 */
export async function autosummarize(store, opts) {
    const options = {
        triggerBlocks: opts?.triggerBlocks || 50,
        chain: opts?.chain,
        useLLM: opts?.useLLM || false,
        provider: opts?.provider,
        dryRun: opts?.dryRun || false,
    };
    // Try to acquire lock
    if (!acquireLock(store)) {
        return {
            summary: {
                version: "v1",
                range: { chain: "", from: 0, to: 0 },
                stats: { journal: 0, ask: 0, decisions: 0 },
                decisions: [],
                topTags: [],
                highlights: [],
                refs: []
            }
        };
    }
    try {
        // Get last summary marker
        const lastMarker = getLastSummaryMarker(store);
        // Start from the block AFTER the last summary, or from beginning if no previous summary
        const fromIndex = lastMarker ? lastMarker.toIndex + 1 : 0;
        // Check if we have enough new blocks
        const journalCount = countBlocksSince(store, "journal", fromIndex);
        const askCount = countBlocksSince(store, "ask", fromIndex);
        const totalNew = journalCount + askCount;
        if (totalNew < options.triggerBlocks && !options.dryRun) {
            return {
                summary: {
                    version: "v1",
                    range: { chain: "", from: fromIndex, to: fromIndex },
                    stats: { journal: journalCount, ask: askCount, decisions: 0 },
                    decisions: [],
                    topTags: [],
                    highlights: [],
                    refs: [],
                }
            };
        }
        // Get blocks to summarize
        const chains = options.chain ? [options.chain] : ["journal", "ask"];
        const blocks = getBlocksToSummarize(store, chains, fromIndex, options.triggerBlocks);
        if (blocks.length === 0) {
            return {
                summary: {
                    version: "v1",
                    range: { chain: "", from: fromIndex, to: fromIndex },
                    stats: { journal: 0, ask: 0, decisions: 0 },
                    decisions: [],
                    topTags: [],
                    highlights: [],
                    refs: [],
                }
            };
        }
        // Build deterministic summary (Level 1)
        const toIndex = Math.max(...blocks.map(b => b.index));
        const summary = buildDeterministicSummary(blocks, fromIndex, toIndex);
        // Level 2: LLM summary (optional)
        let llmSummary;
        if (options.useLLM) {
            llmSummary = await buildLLMSummary(blocks, summary);
        }
        if (options.dryRun) {
            return { summary };
        }
        // Build content
        const lines = [
            `# Autosummary ${new Date().toISOString().split("T")[0]}`,
            "",
            `Range: ${summary.range.from} → ${summary.range.to}`,
            `Blocks: ${summary.stats.journal} journal, ${summary.stats.ask} ask, ${summary.stats.decisions} decisions`,
            "",
        ];
        // Decisions
        if (summary.decisions.length > 0) {
            lines.push("## Decisions");
            for (const d of summary.decisions) {
                lines.push(`- ${d.title}`);
            }
            lines.push("");
        }
        // Top tags
        if (summary.topTags.length > 0) {
            lines.push("## Top Tags");
            lines.push(summary.topTags.map(t => `- ${t.tag}: ${t.count}`).join("\n"));
            lines.push("");
        }
        // Highlights
        if (summary.highlights.length > 0) {
            lines.push("## Recent Highlights");
            for (const h of summary.highlights) {
                lines.push(`- ${h}`);
            }
            lines.push("");
        }
        // LLM summary (if available)
        if (llmSummary) {
            lines.push("## Summary (AI)");
            lines.push(llmSummary);
        }
        lines.push("---");
        lines.push(`summary_version: ${summary.version}`);
        const content = lines.join("\n");
        // Save to summary chain
        const block = await store.appendBlock("summary", {
            type: "system",
            content,
            tags: ["summary", "autosummarizer"],
            agent: "autosummarizer",
            summary_version: "v1",
            summary_range: summary.range,
            summary_refs: summary.refs,
        });
        return { block, summary };
    }
    finally {
        releaseLock(store);
    }
}
/**
 * Check if autosummary should run (for hook integration)
 */
export function shouldTriggerAutosummary(store, threshold = 50) {
    const lastMarker = getLastSummaryMarker(store);
    const fromIndex = lastMarker ? lastMarker.toIndex + 1 : 0;
    const journalCount = countBlocksSince(store, "journal", fromIndex);
    const askCount = countBlocksSince(store, "ask", fromIndex);
    return (journalCount + askCount) >= threshold;
}
//# sourceMappingURL=autosummarizer.js.map