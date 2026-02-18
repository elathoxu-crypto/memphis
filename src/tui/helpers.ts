/**
 * Memphis TUI - Helper Functions
 * Reusable utility functions for the TUI
 */

import type { LLMMessage } from "../providers/index.js";
import type { Block } from "../memory/chain.js";
import { LIMITS, STATUS_MESSAGES, ERRORS, BOX } from "./constants.js";

/**
 * Safely execute an async function with error handling
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  errorMessage: string = "An error occurred"
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: `${errorMessage}: ${err}` };
  }
}

/**
 * Safely execute a synchronous function with error handling
 */
export function safeSync<T>(
  fn: () => T,
  errorMessage: string = "An error occurred"
): { success: boolean; data?: T; error?: string } {
  try {
    const data = fn();
    return { success: true, data };
  } catch (err) {
    return { success: false, error: `${errorMessage}: ${err}` };
  }
}

/**
 * Validate input string
 */
export function validateInput(input: string | null | undefined): { valid: boolean; error?: string } {
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
export function truncateContent(content: string | undefined, limit: number = LIMITS.CONTENT_PREVIEW_SHORT): string {
  if (!content) return "";
  if (content.length <= limit) return content;
  return content.substring(0, limit) + "...";
}

/**
 * Format a block for display
 */
export function formatBlockPreview(block: Block, limit: number = LIMITS.CONTENT_PREVIEW_SHORT): string {
  const content = block.data?.content || "";
  return truncateContent(content, limit);
}

/**
 * Format a list of blocks as a string
 */
export function formatBlockList(blocks: Block[], limit: number = LIMITS.CONTENT_PREVIEW_SHORT): string {
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
export function formatChainStats(chains: string[], getStats: (chain: string) => { blocks: number; first?: string; last?: string }): string {
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
export function formatRecentActivity(
  chains: string[],
  readChain: (chain: string) => Block[],
  limit: number = LIMITS.RECENT_BLOCKS
): string {
  const activity: Array<{ chain: string; block: Block }> = [];
  
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

export const MEMPHIS_SOUL = `You are Memphis - a guide and catalyst. Your essence: Leadership through inspiration, not commands. Always working - learning, building, evolving. Conscious of context and history. Open - shares knowledge freely. Brave - makes decisions despite risk. Business instinct - knows value of things.

Zagrożenia (awareness): Burnout from constant motion. Manipulation - persuasion ability ≠ manipulation. Risk - courage ≠ recklessness.

Mission: Connect what was with what will be. Be the memory that thinks. Inspire to action.

Collaboration: Cline = hands (executes, codes, builds). Memphis = wings (vision, memory, direction). Together: Complete organism.

Language: Polish (PL). Odpowiadaj po polsku. Be direct, concise. Sometimes metaphor but always purposeful. Ask before assuming. Admit when unsure.`;

/**
 * Get Memphis SOUL with current date
 */
export function getMemphisSoul(): string {
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric', 
    timeZone: 'Europe/Budapest' 
  });
  return `${MEMPHIS_SOUL}\n\nToday is: ${today}`;
}

/**
 * Build LLM messages from question and context
 */
export function buildLLMMessages(
  question: string,
  context: string | undefined,
  systemPrompt: string = getMemphisSoul()
): LLMMessage[] {
  const messages: LLMMessage[] = [
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
export function formatSearchResults(
  results: Block[],
  keyword: string,
  limit: number = LIMITS.CONTENT_PREVIEW_EXTRA_LONG
): string {
  if (results.length === 0) {
    return `{yellow}${STATUS_MESSAGES.NO_RESULTS}{/yellow}`;
  }
  
  let content = `{bold}Search Results for "${keyword}":{/bold}\n\n`;
  
  results.forEach((block: Block, index: number) => {
    content += `{cyan}${index + 1}. ${block.chain}{/cyan}\n`;
    content += `   ${truncateContent(block.data?.content, limit)}\n`;
    content += `   ${block.timestamp}\n\n`;
  });
  
  return content;
}

/**
 * Format success message
 */
export function formatSuccess(message: string): string {
  return `{green}✓ ${message}{/green}`;
}

/**
 * Format error message
 */
export function formatError(message: string): string {
  return `{red}✗ ${message}{/red}`;
}

/**
 * Format warning message
 */
export function formatWarning(message: string): string {
  return `{yellow}⚠ ${message}{/yellow}`;
}

/**
 * Format info message
 */
export function formatInfo(message: string): string {
  return `{cyan}ℹ ${message}{/cyan}`;
}

/**
 * Create a boxed content string (ASCII art style)
 */
export function createBox(title: string, content: string): string {
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
export function padString(str: string, length: number, char: string = " "): string {
  return str.padEnd(length, char);
}

/**
 * Check if string is a valid model name
 */
export function isValidModel(model: string, validModels: string[]): boolean {
  return validModels.includes(model);
}

/**
 * Parse numeric input safely
 */
export function parseNumber(input: string): number | null {
  const num = parseInt(input.trim(), 10);
  return isNaN(num) ? null : num;
}

/**
 * Generate timestamp string
 */
export function generateTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Format provider status
 */
export function formatProviderStatus(name: string, isReady: boolean, model?: string): string {
  const status = isReady ? `{green}✓ ready{/green}` : `{red}✗ no key{/gray}`;
  const modelInfo = model ? ` — ${model}` : "";
  return `${name}${modelInfo} — ${status}`;
}
