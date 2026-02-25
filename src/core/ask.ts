import { Store } from "../memory/store.js";
import { recall, type RecallQuery, type RecallHit } from "./recall.js";
import { loadConfig } from "../config/loader.js";
import type { Block } from "../memory/chain.js";
import { OpenRouterProvider } from "../providers/openrouter.js";
import { OllamaProvider } from "../providers/ollama.js";
import { OpenAIProvider } from "../providers/openai.js";
import { CodexProvider } from "../providers/codex.js";
import { getProviderApiKey } from "../integrations/vault-providers.js";
import { OpenClawProvider, isGatewayAvailable } from "../providers/openclaw.js";
import type { LLMMessage, LLMResponse } from "../providers/index.js";

// Keywords that suggest user wants overview/summary
const SUMMARY_TRIGGER_WORDS = [
  "podsumuj", "co ustaliliśmy", "jaki jest plan", "status", "co było ostatnio",
  "kontekst", "overview", "summary", "przegląd", "co się działo",
  "ostatnie", "ostatnio", "histor", "postęp", "progress",
  "what have i", "what's the status", "overview", "summary", "recap",
];

// Keywords that suggest concrete search (don't use summaries)
const CONCRETE_SEARCH_PATTERNS = [
  /\b\d{6,}\b/, // block numbers (000123)
  /\b[0-9a-f]{64}\b/i, // hashes
  /\b\/\w+\/\w+/, // paths
  /[{}()=>;]/, // code syntax
  /```/, // code blocks
  /\.(ts|js|py|rs|go|java|cpp)$/i, // file extensions
];

/**
 * Heuristic: should we use summaries for this query?
 */
function shouldUseSummaries(question: string): boolean {
  const q = question.toLowerCase();
  
  // Check for concrete search patterns (skip summaries)
  for (const pattern of CONCRETE_SEARCH_PATTERNS) {
    if (pattern.test(q) || pattern.test(question)) {
      return false;
    }
  }
  
  // Check for summary trigger words (use summaries)
  for (const word of SUMMARY_TRIGGER_WORDS) {
    if (q.includes(word)) {
      return true;
    }
  }
  
  // Short questions (<= 8 words) might be overview
  const wordCount = q.split(/\s+/).length;
  if (wordCount <= 6) {
    return true; // Default to summaries for short questions
  }
  
  return false; // Default to direct hits
}

/**
 * Get recent summaries from summary chain
 */
function getRecentSummaries(store: Store, max: number = 2): Block[] {
  const summaries = store.readChain("summary");
  // Return newest first, limited to max
  return summaries
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, max);
}

/**
 * Build context string with optional summaries
 */
function buildContextWithSummaries(
  summaries: Block[],
  directHits: RecallHit[],
  maxChars: number = 6000
): { context: string; summaryUsed: number; directUsed: number } {
  const lines: string[] = [
    "MEMPHIS CONTEXT",
    "=".repeat(40),
    "",
  ];

  // Budget: 40% for summaries, 60% for direct hits
  const summaryBudget = Math.floor(maxChars * 0.4);
  const directBudget = maxChars - summaryBudget;
  
  let totalChars = 0;
  let summaryUsed = 0;
  let directUsed = 0;

  // Add summaries section
  if (summaries.length > 0) {
    lines.push("## SUMMARIES (high-level overview)");
    lines.push("");
    
    for (const summary of summaries) {
      const range = summary.data.summary_range;
      const content = summary.data.content || "";
      // Truncate summary content
      const truncated = content.length > 1200 ? content.substring(0, 1200) + "..." : content;
      
      const entry = [
        `[SUM-${summaryUsed + 1}] summary#${String(summary.index).padStart(6, "0")} ${summary.timestamp.split("T")[0]}`,
        `Range: ${range?.from} → ${range?.to}`,
        "",
        truncated,
        "",
      ].join("\n");

      if (totalChars + entry.length > summaryBudget) {
        break;
      }

      lines.push(entry);
      totalChars += entry.length;
      summaryUsed++;
    }
    
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  // Add direct hits section
  lines.push("## DIRECT HITS (specific matches)");
  lines.push("");

  for (let i = 0; i < directHits.length; i++) {
    const hit = directHits[i];
    const blockRef = `${hit.chain}#${String(hit.index).padStart(6, "0")}`;
    const tagStr = hit.tags.length > 0 ? `[${hit.tags.join(", ")}]` : "";
    
    const entry = [
      `[${i + 1}] ${blockRef} ${hit.timestamp.split("T")[0]} ${tagStr}`,
      `"${hit.snippet}"`,
      "",
    ].join("\n");

    if (totalChars + entry.length > maxChars) {
      break;
    }

    lines.push(entry);
    totalChars += entry.length;
    directUsed++;
  }

  return {
    context: lines.join("\n"),
    summaryUsed,
    directUsed,
  };
}

export interface AskOptions {
  question: string;
  chain?: string; // where to save (default: "journal" or "ask")
  provider?: string; // override
  includeVault?: boolean; // default false
  topK?: number; // default 8
  maxContextChars?: number; // default 6000
  since?: string; // optional: limit recall to newer than date
  tags?: string[]; // optional: preferred tags
  noSave?: boolean; // don't save the answer
  json?: boolean; // return JSON with context
  // Summary preferences (5.8)
  preferSummaries?: boolean; // force use of summaries
  noSummaries?: boolean; // disable summaries
  summariesMax?: number; // max summaries to include (default: 2)
  explainContext?: boolean; // print why context was built this way
  vaultPassword?: string; // password for vault decryption
}

export interface AskContextHit {
  chain: string;
  index: number;
  timestamp: string;
  type: string;
  tags: string[];
  snippet: string;
  score: number;
}

export interface AskResult {
  answer: string;
  provider: string;
  model: string;
  tokens_used?: number;
  context: {
    hits: AskContextHit[];
  };
  savedBlock?: Block;
}

/**
 * Build deterministic context string from recall hits
 */
function buildContextString(hits: RecallHit[], maxChars: number = 6000): string {
  const lines: string[] = [
    "MEMPHIS CONTEXT",
    "=".repeat(40),
    "",
  ];

  let totalChars = 0;

  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i];
    const blockRef = `${hit.chain}#${String(hit.index).padStart(6, "0")}`;
    const tagStr = hit.tags.length > 0 ? `[${hit.tags.join(", ")}]` : "";
    
    const entry = [
      `[${i + 1}] ${blockRef} ${hit.timestamp.split("T")[0]} ${tagStr}`,
      `"${hit.snippet}"`,
      "",
    ].join("\n");

    if (totalChars + entry.length > maxChars) {
      break;
    }

    lines.push(entry);
    totalChars += entry.length;
  }

  return lines.join("\n");
}

/**
 * Build prompt with context
 */
function buildPrompt(question: string, context: string): LLMMessage[] {
  const systemPrompt = `You are Memphis, an AI assistant with access to the user's memory chains.
Use the provided context from memory to answer the question. If the context doesn't contain
relevant information, say so honestly. Be concise and helpful.`;

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  if (context) {
    messages.push({
      role: "system",
      content: `Relevant memory context:\n${context}`,
    });
  }

  messages.push({
    role: "user",
    content: question,
  });

  return messages;
}

/**
 * Select provider based on config and options
 */
async function selectProvider(preferred?: string, useVault = false, vaultPassword?: string) {
  const config = loadConfig();
  
  // Force specific provider
  if (preferred) {
    const lower = preferred.toLowerCase();
    
    if (lower === "ollama") {
      const ollamaConfig = config.providers?.ollama;
      if (ollamaConfig) {
        const provider = new OllamaProvider();
        if (provider.isConfigured()) {
          return { provider, name: "Ollama", model: ollamaConfig?.model || "llama3.1" };
        }
      }
      throw new Error("Ollama not configured");
    }
    
    if (lower === "openai") {
      let apiKey: string | undefined;
      if (useVault && vaultPassword) {
        apiKey = await getProviderApiKey("openai", { vaultPassword }) || undefined;
      }
      apiKey = apiKey || process.env.OPENAI_API_KEY;
      if (apiKey) {
        const provider = new OpenAIProvider();
        return { provider, name: "OpenAI", model: config.providers?.openai?.model || "gpt-4o" };
      }
      throw new Error("OpenAI not configured");
    }
    
    if (lower === "openrouter") {
      let apiKey: string | undefined;
      if (useVault && vaultPassword) {
        apiKey = await getProviderApiKey("openrouter", { vaultPassword }) || undefined;
      }
      apiKey = apiKey || process.env.OPENROUTER_API_KEY;
      if (apiKey) {
        const provider = new OpenRouterProvider(apiKey);
        return { provider, name: "OpenRouter", model: config.providers?.openrouter?.model || "anthropic/claude-sonnet-4" };
      }
      throw new Error("OpenRouter not configured");
    }
    
    if (lower === "codex") {
      const codexProvider = new CodexProvider();
      if (codexProvider.isConfigured()) {
        const hasKey = await codexProvider.checkApiKey();
        if (hasKey) {
          return { provider: codexProvider, name: "Codex", model: "gpt-5.2-codex" };
        }
      }
      throw new Error("Codex not configured");
    }
    
    if (lower === "openclaw") {
      if (await isGatewayAvailable()) {
        const ocProvider = new OpenClawProvider();
        if (ocProvider.isConfigured()) {
          return { provider: ocProvider, name: "OpenClaw (MiniMax)", model: "MiniMax-M2.5" };
        }
      }
      // Fallback to local Ollama qwen3:8b if OpenClaw gateway not available
      const ollama = new OllamaProvider();
      if (ollama.isConfigured()) {
        return { provider: ollama, name: "Ollama (qwen3:8b)", model: "qwen3:8b" };
      }
      throw new Error("OpenClaw not available");
    }
    
    throw new Error(`Unknown provider: ${preferred}`);
  }

  // Priority: OpenClaw > Codex > Ollama > OpenAI > OpenRouter
  if (await isGatewayAvailable()) {
    const ocProvider = new OpenClawProvider();
    if (ocProvider.isConfigured()) {
      return { provider: ocProvider, name: "OpenClaw (MiniMax)", model: "MiniMax-M2.5" };
    }
  }

  const codexProvider = new CodexProvider();
  if (codexProvider.isConfigured()) {
    const hasKey = await codexProvider.checkApiKey();
    if (hasKey) {
      return { provider: codexProvider, name: "Codex", model: "gpt-5.2-codex" };
    }
  }

  const ollamaConfig = config.providers?.ollama;
  if (ollamaConfig) {
    const provider = new OllamaProvider();
    if (provider.isConfigured()) {
      // Try configured model first, fallback to qwen3:8b
      const model = ollamaConfig?.model || "llama3.1";
      return { provider, name: "Ollama", model };
    }
  } else {
    // No config - try qwen3:8b as default (common case)
    const provider = new OllamaProvider();
    if (provider.isConfigured()) {
      return { provider, name: "Ollama (qwen3:8b)", model: "qwen3:8b" };
    }
  }

  let apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    const provider = new OpenAIProvider();
    return { provider, name: "OpenAI", model: config.providers?.openai?.model || "gpt-4o" };
  }

  apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey) {
    const provider = new OpenRouterProvider(apiKey);
    return { provider, name: "OpenRouter", model: config.providers?.openrouter?.model || "anthropic/claude-sonnet-4" };
  }

  throw new Error("No provider available");
}

/**
 * Main ask with context function
 */
export async function askWithContext(
  store: Store,
  opts: AskOptions
): Promise<AskResult> {
  const {
    question,
    chain = "ask",
    provider,
    includeVault = false,
    topK = 8,
    maxContextChars = 6000,
    since,
    tags,
    noSave = false,
    json: returnJson = false,
    // Summary options (5.8)
    preferSummaries = false,
    noSummaries = false,
    summariesMax = 2,
    explainContext = false,
    vaultPassword,
  } = opts;

  // Step 1: Decide whether to use summaries
  const useSummaries = preferSummaries || (!noSummaries && shouldUseSummaries(question));
  
  // Get recent summaries if needed
  const summaries = useSummaries ? getRecentSummaries(store, summariesMax) : [];
  
  if (explainContext) {
    console.log(`[Context] Use summaries: ${useSummaries} (prefer=${preferSummaries}, no=${noSummaries}, heuristic=${shouldUseSummaries(question)})`);
    console.log(`[Context] Summaries available: ${summaries.length}`);
  }

  // Step 2: Recall - get relevant context
  const recallQuery: RecallQuery = {
    text: question,
    since,
    includeVault,
    limit: topK * 2, // Get more to filter
  };

  if (tags && tags.length > 0) {
    recallQuery.tag = tags[0]; // Simple tag filter
  }

  const recallResult = recall(store, recallQuery);
  const hits = recallResult.hits.slice(0, topK);

  // Step 3: Build context string (with or without summaries)
  let contextStr: string;
  let summaryUsed = 0;
  let directUsed = hits.length;
  
  if (useSummaries && summaries.length > 0) {
    const result = buildContextWithSummaries(summaries, hits, maxContextChars);
    contextStr = result.context;
    summaryUsed = result.summaryUsed;
    directUsed = result.directUsed;
  } else {
    contextStr = buildContextString(hits, maxContextChars);
  }

  if (explainContext) {
    console.log(`[Context] Summary hits: ${summaryUsed}, Direct hits: ${directUsed}`);
    console.log(`[Context] Context length: ${contextStr.length} chars`);
  }

  // Step 4: Get provider
  let providerResult;
  try {
    providerResult = await selectProvider(provider, includeVault, vaultPassword);
  } catch (err) {
    // No provider - return fallback with recall results
    return {
      answer: "",
      provider: "none",
      model: "",
      context: {
        hits: hits.map(h => ({
          chain: h.chain,
          index: h.index,
          timestamp: h.timestamp,
          type: h.type,
          tags: h.tags,
          snippet: h.snippet,
          score: h.score,
        })),
      },
    };
  }

  // Step 4: Call LLM
  const messages = buildPrompt(question, contextStr);
  
  let response: LLMResponse;
  try {
    response = await providerResult.provider.chat(messages, {
      model: providerResult.model,
      temperature: 0.7,
    });
  } catch (err) {
    throw new Error(`Provider error: ${err}`);
  }

  const answer = response.content;

  // Step 5: Save block (unless noSave)
  let savedBlock: Block | undefined;
  if (!noSave && answer) {
    // Build context refs string for the block (human-readable)
    const contextRefsStr = hits
      .map(h => `${h.chain}#${String(h.index).padStart(6, "0")} score=${h.score}`)
      .join(" ");

    // Build structured context refs (machine-readable)
    const contextRefs = hits.map(h => ({
      chain: h.chain,
      index: h.index,
      score: h.score,
    }));

    const blockContent = `Q: ${question}\n\nA: ${answer}\n\n---\nCONTEXT REFS: ${contextRefsStr}`;

    savedBlock = await store.appendBlock(chain, {
      type: "ask",
      content: blockContent,
      tags: ["ask", ...(tags || [])],
      provider: providerResult.name,
      tokens_used: response.usage?.total_tokens,
      agent: "cli",
      context_refs: contextRefs,
    });
  }

  // Step 6: Return result
  return {
    answer,
    provider: providerResult.name,
    model: providerResult.model,
    tokens_used: response.usage?.total_tokens,
    context: {
      hits: hits.map(h => ({
        chain: h.chain,
        index: h.index,
        timestamp: h.timestamp,
        type: h.type,
        tags: h.tags,
        snippet: h.snippet,
        score: h.score,
      })),
    },
    savedBlock,
  };
}
