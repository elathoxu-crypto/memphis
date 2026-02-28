import { Store } from "../memory/store.js";
import type { Block } from "../memory/chain.js";
import { loadSemanticIndex } from "../embeddings/loader.js";
import { LocalOllamaBackend } from "../embeddings/backends/local.js";
import { dotProduct, normalizeVector } from "../utils/math.js";


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

export interface SemanticOptions {
  semanticWeight?: number;
  semanticOnly?: boolean;
  disableSemantic?: boolean;
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = dotProduct(a, b);
  const normA = Math.sqrt(dotProduct(a, a));
  const normB = Math.sqrt(dotProduct(b, b));
  if (normA === 0 || normB === 0) return 0;
  return dot / (normA * normB);
}

function semanticScore(queryVector: number[], vector: number[]): number {
  return cosineSimilarity(queryVector, vector);
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
export async function recall(store: Store, query: RecallQuery, semanticOptions?: SemanticOptions): Promise<RecallResult> {
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
  const semanticWeight = semanticOptions?.semanticWeight ?? 0.5;
  const useSemantic = !semanticOptions?.disableSemantic && semanticWeight > 0;
  const semanticOnly = semanticOptions?.semanticOnly;

  const semanticHits: RecallHit[] = [];
  if (useSemantic) {
    const queryText = query.text?.trim();
    if (queryText) {
      try {
        const backend = new LocalOllamaBackend();
        await backend.init();
        const queryVector = (await backend.embedBlocks([{ data: { content: queryText } } as any]))[0];
        for (const chain of chains) {
          const index = loadSemanticIndex(chain);
          for (const entry of index) {
            const score = semanticScore(queryVector, entry.vector);
            if (score > 0.2) {
              const chainBlocks = store.readChain(chain);
              const block = chainBlocks.find(b => b.index === entry.blockIndex);
              if (block) {
                semanticHits.push({
                  chain,
                  index: block.index,
                  timestamp: block.timestamp,
                  type: block.data.type,
                  tags: block.data.tags || [],
                  score,
                  snippet: block.data.content?.slice(0, 120) || "",
                  content: block.data.content || "",
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn("Semantic recall failed:", err);
      }
    }
  }

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

  // Merge keyword + semantic with weighted scoring
  const mergedHits = new Map<string, RecallHit>();
  const keywordWeight = 1 - semanticWeight;

  // First add all keyword candidates
  for (const hit of candidates) {
    const key = `${hit.chain}:${hit.index}`;
    // Normalize keyword score to 0-1 range (max possible is ~10)
    const normScore = keywordWeight > 0 ? (hit.score / 10) * keywordWeight : 0;
    mergedHits.set(key, { ...hit, score: normScore });
  }

  // Then add/merge semantic hits
  for (const hit of semanticHits) {
    const key = `${hit.chain}:${hit.index}`;
    const existing = mergedHits.get(key);
    if (existing) {
      // Merge: add semantic score
      existing.score += hit.score * semanticWeight;
    } else {
      // New hit from semantic only
      mergedHits.set(key, { ...hit, score: hit.score * semanticWeight });
    }
  }

  const allHits = Array.from(mergedHits.values());

  // Sort: score desc, then timestamp desc
  allHits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.timestamp.localeCompare(a.timestamp);
  });

  // Apply limit
  const hits = allHits.slice(0, limit);

  return { query, hits };
}
