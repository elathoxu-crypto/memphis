/**
 * Memphis TUI - Helper Functions
 * Reusable utility functions for the TUI
 */
import type { LLMMessage } from "../providers/index.js";
import type { Block } from "../memory/chain.js";
/**
 * Safely execute an async function with error handling
 */
export declare function safeAsync<T>(fn: () => Promise<T>, errorMessage?: string): Promise<{
    success: boolean;
    data?: T;
    error?: string;
}>;
/**
 * Safely execute a synchronous function with error handling
 */
export declare function safeSync<T>(fn: () => T, errorMessage?: string): {
    success: boolean;
    data?: T;
    error?: string;
};
/**
 * Validate input string
 */
export declare function validateInput(input: string | null | undefined): {
    valid: boolean;
    error?: string;
};
/**
 * Truncate content with ellipsis
 */
export declare function truncateContent(content: string | undefined, limit?: number): string;
/**
 * Format a block for display
 */
export declare function formatBlockPreview(block: Block, limit?: number): string;
/**
 * Format a list of blocks as a string
 */
export declare function formatBlockList(blocks: Block[], limit?: number): string;
/**
 * Format chains as sidebar stats
 */
export declare function formatChainStats(chains: string[], getStats: (chain: string) => {
    blocks: number;
    first?: string;
    last?: string;
}): string;
/**
 * Format recent activity from chains
 */
export declare function formatRecentActivity(chains: string[], readChain: (chain: string) => Block[], limit?: number): string;
/**
 * Build LLM messages from question and context
 */
export declare function buildLLMMessages(question: string, context: string | undefined, systemPrompt?: string): LLMMessage[];
/**
 * Format search results
 */
export declare function formatSearchResults(results: Block[], keyword: string, limit?: number): string;
/**
 * Format success message
 */
export declare function formatSuccess(message: string): string;
/**
 * Format error message
 */
export declare function formatError(message: string): string;
/**
 * Format warning message
 */
export declare function formatWarning(message: string): string;
/**
 * Format info message
 */
export declare function formatInfo(message: string): string;
/**
 * Create a boxed content string (ASCII art style)
 */
export declare function createBox(title: string, content: string): string;
/**
 * Pad string to specific length
 */
export declare function padString(str: string, length: number, char?: string): string;
/**
 * Check if string is a valid model name
 */
export declare function isValidModel(model: string, validModels: string[]): boolean;
/**
 * Parse numeric input safely
 */
export declare function parseNumber(input: string): number | null;
/**
 * Generate timestamp string
 */
export declare function generateTimestamp(): string;
/**
 * Sleep for specified milliseconds
 */
export declare function sleep(ms: number): Promise<void>;
/**
 * Capitalize first letter
 */
export declare function capitalize(str: string): string;
/**
 * Format provider status
 */
export declare function formatProviderStatus(name: string, isReady: boolean, model?: string): string;
