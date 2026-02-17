// Sliding Window Context Manager
// Automatically manages context size by summarizing old blocks
const DEFAULT_CONFIG = {
    maxBlocks: 100,
    summaryThreshold: 80, // Start summarizing when 80% full
    minBlocksForSummary: 20,
    summaryChain: "summary",
};
/**
 * SlidingWindow - Manages context by keeping recent blocks and summarizing old ones
 */
export class SlidingWindow {
    store;
    config;
    recentBlocks = [];
    constructor(store, config = {}) {
        this.store = store;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.loadRecentBlocks();
    }
    /**
     * Load recent blocks into memory
     */
    loadRecentBlocks() {
        const allBlocks = this.store.readChain("journal");
        // Keep only the most recent blocks
        this.recentBlocks = allBlocks.slice(-this.config.maxBlocks);
    }
    /**
     * Get the current context (recent blocks)
     */
    getContext(limit) {
        if (limit) {
            return this.recentBlocks.slice(-limit);
        }
        return [...this.recentBlocks];
    }
    /**
     * Get context as formatted strings for LLM
     */
    getContextAsStrings(limit) {
        const blocks = this.getContext(limit);
        return blocks.map(b => `[${b.timestamp}] ${b.data.content}`);
    }
    /**
     * Add a new block and manage sliding window
     */
    addBlock(data) {
        const block = this.store.addBlock("journal", data);
        this.recentBlocks.push(block);
        // Check if we need to slide/summarize
        if (this.recentBlocks.length > this.config.summaryThreshold) {
            this.slide();
        }
        return block;
    }
    /**
     * Slide the window - summarize old blocks if needed
     */
    slide() {
        // If we're over the limit, just trim (simple sliding)
        if (this.recentBlocks.length > this.config.maxBlocks) {
            const oldBlocks = this.recentBlocks.slice(0, -this.config.maxBlocks);
            this.recentBlocks = this.recentBlocks.slice(-this.config.maxBlocks);
            // If we have enough old blocks, summarize them
            if (oldBlocks.length >= this.config.minBlocksForSummary) {
                this.summarizeOldBlocks(oldBlocks);
            }
        }
    }
    /**
     * Summarize old blocks and store the summary
     */
    summarizeOldBlocks(blocks) {
        // Create a summary of the old blocks
        const summaryContent = this.generateSummary(blocks);
        // Store the summary
        this.store.addBlock(this.config.summaryChain, {
            type: "system",
            content: `[Summary of ${blocks.length} blocks] ${summaryContent}`,
            tags: ["summary", "context-compression"],
        });
    }
    /**
     * Generate a summary from blocks (simple extractive summarization)
     */
    generateSummary(blocks) {
        // Simple extractive summarization - take first sentence of each block
        const summaries = blocks.map(b => {
            const content = b.data.content;
            // Take first sentence or first 100 chars
            const firstSentence = content.split(/[.!?]/)[0];
            return firstSentence.length > 100
                ? firstSentence.slice(0, 100) + "..."
                : firstSentence;
        });
        return summaries.join(" | ");
    }
    /**
     * Get summaries from the summary chain
     */
    getSummaries(limit = 5) {
        return this.store.readChain(this.config.summaryChain).slice(-limit);
    }
    /**
     * Check if summarization is needed
     */
    needsSummarization() {
        return this.recentBlocks.length >= this.config.summaryThreshold;
    }
    /**
     * Get statistics about the sliding window
     */
    getStats() {
        return {
            currentBlocks: this.recentBlocks.length,
            maxBlocks: this.config.maxBlocks,
            utilization: Math.round((this.recentBlocks.length / this.config.maxBlocks) * 100),
            needsSummary: this.needsSummarization(),
        };
    }
    /**
     * Force a slide operation (manual trigger)
     */
    forceSlide() {
        this.slide();
    }
    /**
     * Reset the sliding window (reload from disk)
     */
    reset() {
        this.recentBlocks = [];
        this.loadRecentBlocks();
    }
}
/**
 * ContextManager - Higher-level context management with LLM summarization support
 */
export class ContextManager {
    store;
    slidingWindow;
    constructor(store, config) {
        this.store = store;
        this.slidingWindow = new SlidingWindow(store, config);
    }
    /**
     * Get context for LLM with automatic summarization
     */
    async getContextForLLM(maxTokens = 4000, summarizer) {
        const blocks = this.slidingWindow.getContext();
        let context = "";
        let usedBlocks = [];
        // Simple token estimation (avg 4 chars per token)
        const maxChars = maxTokens * 4;
        for (const block of blocks.reverse()) { // Start from most recent
            const blockText = `[${block.timestamp}] ${block.data.content}\n`;
            if (context.length + blockText.length > maxChars) {
                break;
            }
            context = blockText + context;
            usedBlocks.unshift(block);
        }
        // Check if we need summarization
        const stats = this.slidingWindow.getStats();
        const needsSummary = stats.needsSummary;
        return {
            context: context.trim(),
            blocks: usedBlocks,
            needsSummary,
        };
    }
    /**
     * Add a new entry to context
     */
    addEntry(content, type = "journal", tags = []) {
        return this.slidingWindow.addBlock({
            type: type,
            content,
            tags,
        });
    }
    /**
     * Get sliding window statistics
     */
    getStats() {
        return this.slidingWindow.getStats();
    }
    /**
     * Get historical summaries
     */
    getSummaries(limit) {
        return this.slidingWindow.getSummaries(limit);
    }
}
//# sourceMappingURL=sliding-window.js.map