/**
 * Memphis TUI - Helper Functions
 * Reusable utility functions for the TUI
 */
import { LIMITS, STATUS_MESSAGES, ERRORS, BOX } from "./constants.js";
/**
 * Safely execute an async function with error handling
 */
export async function safeAsync(fn, errorMessage = "An error occurred") {
    try {
        const data = await fn();
        return { success: true, data };
    }
    catch (err) {
        return { success: false, error: `${errorMessage}: ${err}` };
    }
}
/**
 * Safely execute a synchronous function with error handling
 */
export function safeSync(fn, errorMessage = "An error occurred") {
    try {
        const data = fn();
        return { success: true, data };
    }
    catch (err) {
        return { success: false, error: `${errorMessage}: ${err}` };
    }
}
/**
 * Validate input string
 */
export function validateInput(input) {
    if (!input) {
        return { valid: false, error: ERRORS.EMPTY_INPUT };
    }
    const trimmed = input.trim();
    if (trimmed.length === 0) {
        return { valid: false, error: ERRORS.EMPTY_INPUT };
    }
    return { valid: true };
}
/**
 * Truncate content with ellipsis
 */
export function truncateContent(content, limit = LIMITS.CONTENT_PREVIEW_SHORT) {
    if (!content)
        return "";
    if (content.length <= limit)
        return content;
    return content.substring(0, limit) + "...";
}
/**
 * Format a block for display
 */
export function formatBlockPreview(block, limit = LIMITS.CONTENT_PREVIEW_SHORT) {
    const content = block.data?.content || "";
    return truncateContent(content, limit);
}
/**
 * Format a list of blocks as a string
 */
export function formatBlockList(blocks, limit = LIMITS.CONTENT_PREVIEW_SHORT) {
    if (blocks.length === 0) {
        return STATUS_MESSAGES.NO_RESULTS;
    }
    return blocks
        .map((block, index) => {
        const preview = formatBlockPreview(block, limit);
        return `${index + 1}. ${preview}`;
    })
        .join("\n");
}
/**
 * Format chains as sidebar stats
 */
export function formatChainStats(chains, getStats) {
    let content = `Chains: ${chains.length}\n`;
    chains.forEach((chain) => {
        const stats = getStats(chain);
        content += `  - ${chain}: ${stats.blocks} blocks\n`;
    });
    return content;
}
/**
 * Format recent activity from chains
 */
export function formatRecentActivity(chains, readChain, limit = LIMITS.RECENT_BLOCKS) {
    const activity = [];
    chains.slice(0, limit).forEach((chain) => {
        const blocks = readChain(chain);
        if (blocks.length > 0) {
            const lastBlock = blocks[blocks.length - 1];
            activity.push({ chain, block: lastBlock });
        }
    });
    if (activity.length === 0) {
        return "No recent activity";
    }
    return activity
        .map(({ chain, block }) => `  * ${chain}: ${truncateContent(block.data?.content, LIMITS.CONTENT_PREVIEW_SHORT)}...`)
        .join("\n");
}
/**
 * Build LLM messages from question and context
 */
export function buildLLMMessages(question, context, systemPrompt = "You are Memphis, a helpful AI assistant. Be concise and friendly.") {
    const messages = [
        { role: "system", content: systemPrompt },
    ];
    if (context) {
        messages.push({
            role: "system",
            content: `Relevant memory:\n${context}`,
        });
    }
    messages.push({
        role: "user",
        content: question,
    });
    return messages;
}
/**
 * Format search results
 */
export function formatSearchResults(results, keyword, limit = LIMITS.CONTENT_PREVIEW_EXTRA_LONG) {
    if (results.length === 0) {
        return `{yellow}${STATUS_MESSAGES.NO_RESULTS}{/yellow}`;
    }
    let content = `{bold}Search Results for "${keyword}":{/bold}\n\n`;
    results.forEach((block, index) => {
        content += `{cyan}${index + 1}. ${block.chain}{/cyan}\n`;
        content += `   ${truncateContent(block.data?.content, limit)}\n`;
        content += `   ${block.timestamp}\n\n`;
    });
    return content;
}
/**
 * Format success message
 */
export function formatSuccess(message) {
    return `{green}✓ ${message}{/green}`;
}
/**
 * Format error message
 */
export function formatError(message) {
    return `{red}✗ ${message}{/red}`;
}
/**
 * Format warning message
 */
export function formatWarning(message) {
    return `{yellow}⚠ ${message}{/yellow}`;
}
/**
 * Format info message
 */
export function formatInfo(message) {
    return `{cyan}ℹ ${message}{/cyan}`;
}
/**
 * Create a boxed content string (ASCII art style)
 */
export function createBox(title, content) {
    const width = BOX.WIDTH;
    const line = BOX.LINE_CHAR.repeat(width - 2);
    const paddedTitle = title.padEnd(width - 4);
    const paddedContent = content.split('\n').map(line => `║ ${line.padEnd(width - 4)}║`).join('\n');
    return `
╔${line}╗
║ ${paddedTitle}║
╠${line}╣
${paddedContent}
╚${line}╝
`;
}
/**
 * Pad string to specific length
 */
export function padString(str, length, char = " ") {
    return str.padEnd(length, char);
}
/**
 * Check if string is a valid model name
 */
export function isValidModel(model, validModels) {
    return validModels.includes(model);
}
/**
 * Parse numeric input safely
 */
export function parseNumber(input) {
    const num = parseInt(input.trim(), 10);
    return isNaN(num) ? null : num;
}
/**
 * Generate timestamp string
 */
export function generateTimestamp() {
    return new Date().toISOString();
}
/**
 * Sleep for specified milliseconds
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Capitalize first letter
 */
export function capitalize(str) {
    if (!str)
        return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
}
/**
 * Format provider status
 */
export function formatProviderStatus(name, isReady, model) {
    const status = isReady ? `{green}✓ ready{/green}` : `{red}✗ no key{/gray}`;
    const modelInfo = model ? ` — ${model}` : "";
    return `${name}${modelInfo} — ${status}`;
}
//# sourceMappingURL=helpers.js.map