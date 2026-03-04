import { Store, type IStore } from "../memory/store.js";
import type { Block } from "../memory/chain.js";
import { loadSemanticIndex } from "../embeddings/loader.js";
import { LocalOllamaBackend } from "../embeddings/backends/local.js";
import { dotProduct } from "../utils/math.js";

// Optimized Recall with Pre-Search + Error Recovery (v3.5.0)

export interface RecallQuery {
  text?: string;
  chain?: string;
  type?: string;
  tag?: string;
  since?: string;
  until?: string;
  limit?: number;
  includeVault?: boolean;
  // v3.5.0: Pre-search options
  preSearchFilter?: boolean; // Enable chain-level filtering (default: true)
  maxChainsToSearch?: number; // Limit chains to search (default: 5)
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
  // v3.5.0: Performance metrics
  metrics?: {
    chainsSearched: number;
    chainsSkipped: number;
    semanticSearchUsed: boolean;
    preSearchFilterUsed: boolean;
    errorRecoveryTriggered: boolean;
  };
}

export interface SemanticOptions {
  semanticWeight?: number;
  semanticOnly?: boolean;
  disableSemantic?: boolean;
}

// v3.5.0: Error Recovery Wrapper
async function safeChainRead(
  store: IStore,
  chain: string,
  retries: number = 2
): Promise<Block[]> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return store.readChain(chain);
    } catch (err) {
      if (attempt === retries) {
        console.error(`[Recall] Chain read failed after ${retries} retries: ${chain}`, err);
        return []; // Return empty instead of crashing
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
    }
  }
  return [];
}

// v3.5.0: Pre-Search Chain Filtering
async function identifyRelevantChains(
  query: RecallQuery,
  store: IStore,
  allChains: string[],
  maxChains: number = 5
): Promise<string[]> {
  const queryText = query.text?.toLowerCase().trim();

  if (!queryText) {
    // No query text → search all chains
    return allChains;
  }

  // Chain priority based on query patterns
  const chainPriorities: Map<string, number> = new Map();

  // Decision-related queries → prioritize decisions chain
  if (/\b(postanowił|zdecydowa|decision|wybra|plan|roadmap)\b/i.test(queryText)) {
    chainPriorities.set("decisions", 3);
    chainPriorities.set("decision", 2);
  }

  // Question queries → prioritize ask chain
  if (/\?|co|jak|dlaczego|kiedy|what|how|why|when/i.test(queryText)) {
    chainPriorities.set("ask", 3);
  }

  // Daily operations → prioritize journal
  if (/\bdziś|dzisiaj|wczoraj|ostatnio|recently|today|yesterday\b/i.test(queryText)) {
    chainPriorities.set("journal", 3);
  }

  // Multi-agent → prioritize share chain
  if (/\bwatra|style|alpha|gamma|multi.?agent|sync|network\b/i.test(queryText)) {
    chainPriorities.set("share", 3);
  }

  // Semantic pre-search: check which chains have highest semantic scores
  try {
    const backend = new LocalOllamaBackend();
    await backend.init();
    const queryVector = (await backend.embedBlocks([{ data: { content: queryText } } as any]))[0];

    const chainScores: Array<{ chain: string; score: number }> = [];

    for (const chain of allChains) {
      const index = loadSemanticIndex(chain);
      if (index.length === 0) continue;

      // Sample top 5 blocks from chain
      const topBlocks = index.slice(0, 5);
      let avgScore = 0;

      for (const entry of topBlocks) {
        const similarity = cosineSimilarity(queryVector, entry.vector);
        avgScore += similarity;
      }

      avgScore /= topBlocks.length;
      if (avgScore > 0.3) { // Threshold
        chainScores.push({ chain, score: avgScore });
      }
    }

    // Add semantic scores to priorities
    for (const { chain, score } of chainScores) {
      const current = chainPriorities.get(chain) || 0;
      chainPriorities.set(chain, current + score * 2);
    }
  } catch (err) {
    console.warn("[Recall] Pre-search semantic filtering failed:", err);
    // Continue with keyword-based priorities
  }

  // Sort chains by priority and return top N
  const sortedChains = allChains
    .map(chain => ({
      chain,
      priority: chainPriorities.get(chain) || 0
    }))
    .sort((a, b) => b.priority - a.priority)
    .slice(0, maxChains)
    .map(item => item.chain);

  return sortedChains;
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
 * Build recall result from query (OPTIMIZED v3.5.0)
 */
export async function recall(
  store: IStore,
  query: RecallQuery,
  semanticOptions?: SemanticOptions
): Promise<RecallResult> {
  const limit = query.limit || 20;
  const candidates: RecallHit[] = [];

  // v3.5.0: Performance metrics
  let chainsSearched = 0;
  let chainsSkipped = 0;
  let semanticSearchUsed = false;
  let preSearchFilterUsed = false;
  let errorRecoveryTriggered = false;

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

  // v3.5.0: Pre-search chain filtering
  const usePreSearch = query.preSearchFilter !== false && !query.chain;
  if (usePreSearch && chains.length > 3) {
    const maxChains = query.maxChainsToSearch || 5;
    const originalCount = chains.length;
    chains = await identifyRelevantChains(query, store, chains, maxChains);
    chainsSkipped = originalCount - chains.length;
    preSearchFilterUsed = true;
  }

  const sinceMs = parseDate(query.since);
  const untilMs = parseDate(query.until);

  // Search each chain
  const semanticWeight = semanticOptions?.semanticWeight ?? 0.5;
  const useSemantic = !semanticOptions?.disableSemantic && semanticWeight > 0;
  const semanticOnly = useSemantic ? semanticOptions?.semanticOnly : false;
  const effectiveSemanticWeight = useSemantic ? semanticWeight : 0;

  const semanticHits: RecallHit[] = [];
  if (useSemantic) {
    const queryText = query.text?.trim();
    if (queryText) {
      try {
        const backend = new LocalOllamaBackend();
        await backend.init();
        const queryVector = (await backend.embedBlocks([{ data: { content: queryText } } as any]))[0];
        semanticSearchUsed = true;

        for (const chain of chains) {
          chainsSearched++;
          const index = loadSemanticIndex(chain);

          for (const entry of index) {
            const score = semanticScore(queryVector, entry.vector);
            if (score > 0.2) {
              // v3.5.0: Safe chain read with error recovery
              const chainBlocks = await safeChainRead(store, chain);
              if (chainBlocks.length === 0) {
                errorRecoveryTriggered = true;
              }

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
        console.warn("[Recall] Semantic recall failed:", err);
        errorRecoveryTriggered = true;
      }
    }
  }

  if (!semanticOnly) {
    for (const chain of chains) {
      // v3.5.0: Safe chain read with error recovery
      const blocks = await safeChainRead(store, chain);
      if (blocks.length === 0) {
        errorRecoveryTriggered = true;
      }
      chainsSearched++;

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
  }

  // Merge keyword + semantic with weighted scoring
  const mergedHits = new Map<string, RecallHit>();
  const keywordWeight = semanticOnly ? 0 : (1 - effectiveSemanticWeight);

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
      existing.score += hit.score * effectiveSemanticWeight;
    } else {
      // New hit from semantic only
      mergedHits.set(key, { ...hit, score: hit.score * effectiveSemanticWeight });
    }
  }

  const allHits = Array.from(mergedHits.values());

  const RECENCY_WINDOW_MS = Number(process.env.MEMPHIS_RECENCY_WINDOW_DAYS || 7) * 24 * 60 * 60 * 1000;
  const RECENCY_WEIGHT = Number(process.env.MEMPHIS_RECENCY_WEIGHT || 0.2);

  if (RECENCY_WEIGHT > 0 && RECENCY_WINDOW_MS > 0) {
    const now = Date.now();
    for (const hit of allHits) {
      const ts = new Date(hit.timestamp).getTime();
      if (!Number.isFinite(ts)) continue;
      const age = now - ts;
      if (age >= 0 && age <= RECENCY_WINDOW_MS) {
        const freshness = 1 - age / RECENCY_WINDOW_MS;
        hit.score += RECENCY_WEIGHT * Math.max(0, freshness);
      }
    }
  }

  // Sort: score desc, then timestamp desc
  allHits.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.timestamp.localeCompare(a.timestamp);
  });

  // Apply limit
  const hits = allHits.slice(0, limit);

  return {
    query,
    hits,
    metrics: {
      chainsSearched,
      chainsSkipped,
      semanticSearchUsed,
      preSearchFilterUsed,
      errorRecoveryTriggered
    }
  };
}
