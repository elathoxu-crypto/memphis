import { Store } from "../memory/store.js";
import type { Block } from "../memory/chain.js";

export interface RecallQuery {
  text?: string;
  chain?: string;
  type?: string;
  tag?: string;
  since?: string;
  until?: string;
  limit?: number;
  includeVault?: boolean;
}

export interface RecallHit {
  chain: string;
  index: number;
  timestamp: string;
  type: string;
  tags: string[];
  score: number;
  snippet: string;
  content: string;
}

export interface RecallResult {
  query: RecallQuery;
  hits: RecallHit[];
}

/**
 * Simple scoring without embeddings
 */
function scoreBlock(block: Block, query: RecallQuery): number {
  let score = 0;
  const q = query.text?.toLowerCase() || "";
  const content = (block.data.content || "").toLowerCase();
  const type = block.data.type?.toLowerCase() || "";
  const tags = (block.data.tags || []).map(t => t.toLowerCase());

  if (!q) return 0;

  // +3 exact match in content
  if (content.includes(q)) {
    score += 3;
  }

  // +2 match in tags
  for (const tag of tags) {
    if (tag.includes(q)) {
      score += 2;
      break;
    }
  }

  // +1 match in type
  if (type.includes(q)) {
    score += 1;
  }

  return score;
}

/**
 * Parse date string to timestamp
 */
function parseDate(dateStr?: string): number | undefined {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? undefined : d.getTime();
}

/**
 * Build recall result from query
 */
export function recall(store: Store, query: RecallQuery): RecallResult {
  const limit = query.limit || 20;
  const candidates: RecallHit[] = [];

  // Get chains to search
  let chains = store.listChains();
  
  // Exclude vault/credential by default
  if (!query.includeVault) {
    chains = chains.filter(c => c !== "vault" && c !== "credential");
  }

  // If specific chain requested, only that one
  if (query.chain) {
    chains = chains.includes(query.chain) ? [query.chain] : [];
  }

  const sinceMs = parseDate(query.since);
  const untilMs = parseDate(query.until);

  // Search each chain
  for (const chain of chains) {
    const blocks = store.readChain(chain);

    for (const block of blocks) {
      // Time filter
      const blockMs = new Date(block.timestamp).getTime();
      if (sinceMs && blockMs < sinceMs) continue;
      if (untilMs && blockMs > untilMs) continue;

      // Type filter
      if (query.type && block.data.type !== query.type) continue;

      // Tag filter
      if (query.tag && !block.data.tags?.includes(query.tag)) continue;

      // Text score
      const score = scoreBlock(block, query);
      if (score > 0 || !query.text) {
        // Create snippet (first 120 chars)
        const content = block.data.content || "";
        const snippet = content.length > 120 
          ? content.substring(0, 120) + "..." 
          : content;

        candidates.push({
          chain,
          index: block.index,
          timestamp: block.timestamp,
          type: block.data.type,
          tags: block.data.tags || [],
          score,
          snippet,
          content,
        });
      }
    }
  }

  // Sort: score desc, then timestamp desc
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.timestamp.localeCompare(a.timestamp);
  });

  // Apply limit
  const hits = candidates.slice(0, limit);

  return { query, hits };
}
