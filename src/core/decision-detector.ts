import chalk from "chalk";
import { Store, type IStore } from "../memory/store.js";
import { loadConfig } from "../config/loader.js";
import type { Block } from "../memory/chain.js";
import { resolveProvider } from "../providers/factory.js";
import type { LLMMessage } from "../providers/index.js";

export interface DecisionResult {
  isDecision: boolean;
  title?: string;
  decision?: string;
  rationale?: string;
  confidence: number;
  tags?: string[];
}

// Decision keywords and patterns
const DECISION_PATTERNS = [
  // Polish
  /\b(postanawiam|postanowiliśmy|decyduję|decide|ustalam|ustaliliśmy|ustalmy|wybieram|wybraliśmy|od teraz|to jest|muszę|zrobimy|najlepiej|rekomenduję)\b/i,
  /\b(decyzja|decision)\s*[:\-]/i,
  // English
  /\b(I decided|we decided|I've decided|going with|settling on|choosing|picking|opting for)\b/i,
  /\b(decision|conclusion)\s*[:\-]/i,
  // Action phrases
  /\b(will do|must do|need to|should|going to)\b.*\b(instead|rather|instead of)\b/i,
  // Priority/importance
  /\b(prioritize|priority is|most important|first thing|main goal)\b/i,
];

// Structure patterns - extract decision components
const TITLE_PATTERNS = [
  /^([A-Z].{10,80}?)(?:\n|$)/m, // First line if it's a heading-like sentence
  /(?:decision|postanowienie)[:\s]+(.+?)(?:\n|$)/i,
  /(?:ustalamy|ustalam)[:\s]+(.+?)(?:\n|$)/i,
];

const DECISION_LINE_PATTERNS = [
  /^(?:→|=>|»|- ?Decision:?)\s*(.+)$/m,
  /^(\d+\..+?)(?:\n|$)/m,
];

/**
 * Simple heuristic decision detection
 */
function detectHeuristic(content: string): DecisionResult {
  let matchCount = 0;
  let bestMatch = "";
  
  for (const pattern of DECISION_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      matchCount++;
      bestMatch = match[0] || bestMatch;
    }
  }

  // Confidence based on number of matches
  let confidence = 0;
  if (matchCount >= 3) confidence = 0.9;
  else if (matchCount === 2) confidence = 0.7;
  else if (matchCount === 1) confidence = 0.5;

  // Try to extract title
  let title: string | undefined;
  for (const pattern of TITLE_PATTERNS) {
    const match = content.match(pattern);
    if (match && match[1]) {
      title = match[1].trim();
      break;
    }
  }

  // If no title found, use first meaningful line
  if (!title) {
    const lines = content.split("\n").filter(l => l.trim().length > 10);
    if (lines.length > 0) {
      title = lines[0].substring(0, 80);
    }
  }

  // Extract decision line if present
  let decision: string | undefined;
  for (const pattern of DECISION_LINE_PATTERNS) {
    const match = content.match(pattern);
    if (match && match[1]) {
      decision = match[1].trim();
      break;
    }
  }

  // Extract rationale (lines after decision)
  let rationale: string | undefined;
  if (decision) {
    const decisionIdx = content.indexOf(decision);
    if (decisionIdx > 0) {
      const after = content.substring(decisionIdx + decision.length).trim();
      const lines = after.split("\n").slice(0, 3).join(" ");
      if (lines.length > 10) {
        rationale = lines.substring(0, 200);
      }
    }
  }

  return {
    isDecision: confidence > 0,
    title,
    decision,
    rationale,
    confidence,
  };
}

/**
 * LLM-based decision classification (optional)
 */
async function detectWithLLM(
  content: string,
  provider?: string
): Promise<DecisionResult> {
  const { provider: llm, name: providerName } = await resolveProvider({ provider });

  const messages: LLMMessage[] = [
    {
      role: "system",
      content: `Analyze if the following text contains a decision. A decision is a commitment to do something, a choice between options, or a conclusion that leads to action.

Respond with JSON:
{
  "isDecision": true/false,
  "title": "short title if decision found",
  "decision": "the key decision made",
  "confidence": 0.0-1.0,
  "rationale": "brief reasoning (optional)"
}

Only respond with valid JSON, no other text.`
    },
    {
      role: "user",
      content: content.substring(0, 2000), // Limit context
    }
  ];

  try {
    const response = await llm.chat(messages, { temperature: 0.3 });
    const text = response.content;
    
    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isDecision: parsed.isDecision ?? false,
        title: parsed.title,
        decision: parsed.decision,
        rationale: parsed.rationale,
        confidence: parsed.confidence ?? 0.5,
      };
    }
  } catch (err) {
    console.error("LLM decision detection failed:", err);
  }

  // Fallback to heuristic
  return detectHeuristic(content);
}

/**
 * Main decision detection function
 */
export async function detectDecision(
  store: IStore,
  input: {
    content: string;
    type: string;
    tags?: string[];
  },
  options?: {
    useLLM?: boolean;
    provider?: string;
    threshold?: number;
  }
): Promise<DecisionResult> {
  const opts = {
    useLLM: options?.useLLM ?? false,
    provider: options?.provider,
    threshold: options?.threshold ?? 0.5,
  };

  // First, quick heuristic check
  const heuristicResult = detectHeuristic(input.content);
  
  // If confident enough, return early
  if (heuristicResult.confidence >= 0.7) {
    return heuristicResult;
  }

  // If LLM requested or heuristic uncertain, use LLM
  if (opts.useLLM) {
    try {
      const llmResult = await detectWithLLM(input.content, opts.provider);
      
      // Combine results (LLM wins if more confident)
      if (llmResult.confidence > heuristicResult.confidence) {
        return llmResult;
      }
    } catch (err) {
      console.error("LLM detection failed, using heuristic:", err);
    }
  }

  return heuristicResult;
}

/**
 * Check for duplicate decision (same source block OR similar title)
 */
function isDuplicateDecision(
  store: IStore,
  sourceChain: string,
  sourceIndex: number,
  title?: string,
  checkLastN: number = 10
): boolean {
  const decisions = store.readChain("decision");
  const recent = decisions.slice(-checkLastN);
  
  for (const block of recent) {
    // Same source block
    if (block.data.source_ref?.chain === sourceChain && 
        block.data.source_ref?.index === sourceIndex) {
      return true;
    }
    // Similar title (first 50 chars, normalize #)
    if (title && block.data.content) {
      const blockTitle = block.data.content.split("\n")[0]?.replace(/^#\s*/, "").substring(0, 50);
      const normalizedTitle = title.replace(/^#\s*/, "");
      if (blockTitle && blockTitle.substring(0, 30) === normalizedTitle.substring(0, 30)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Save decision to decision chain
 */
export async function saveDecision(
  store: IStore,
  sourceBlock: Block,
  detection: DecisionResult
): Promise<Block | undefined> {
  if (!detection.isDecision || detection.confidence < 0.5) {
    return undefined;
  }

  // Check for duplicate
  if (isDuplicateDecision(store, sourceBlock.chain, sourceBlock.index, detection.title)) {
    console.log(chalk.gray(`  ⏭ Skipping duplicate decision from ${sourceBlock.chain}#${sourceBlock.index}`));
    return undefined;
  }

  const content = [
    detection.title ? `# ${detection.title}` : "",
    detection.decision ? `→ ${detection.decision}` : "",
    detection.rationale ? `\n${detection.rationale}` : "",
    `\n---\nSource: ${sourceBlock.chain}#${String(sourceBlock.index).padStart(6, "0")}`,
    `Confidence: ${detection.confidence.toFixed(2)}`,
  ].filter(Boolean).join("\n");

  const decisionBlock = await store.appendBlock("decision", {
    type: "decision",
    content,
    tags: [...(detection.tags || []), ...(sourceBlock.data.tags || [])],
    agent: sourceBlock.data.agent,
    provider: sourceBlock.data.provider,
    source_ref: {
      chain: sourceBlock.chain,
      index: sourceBlock.index,
      hash: sourceBlock.hash,
    },
  });

  return decisionBlock;
}

/**
 * Hook: check and save decision after block save
 * Returns the decision block if one was created
 */
export async function checkAndSaveDecision(
  store: IStore,
  block: Block
): Promise<Block | undefined> {
  // Only check journal and ask blocks
  if (block.data.type !== "journal" && block.data.type !== "ask") {
    return undefined;
  }

  const result = await detectDecision(store, {
    content: block.data.content,
    type: block.data.type,
    tags: block.data.tags,
  });

  if (result.isDecision && result.confidence >= 0.5) {
    return saveDecision(store, block, result);
  }

  return undefined;
}
