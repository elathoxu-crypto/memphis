/**
 * Reflection Engine v1 — Memphis
 *
 * Generates structured self-reflection reports from memory chains.
 * Uses semantic recall (if available) + decision analysis + journal review.
 *
 * Commands:
 *   memphis reflect            — default: weekly reflection
 *   memphis reflect --daily    — light daily check-in
 *   memphis reflect --deep     — deep dive with LLM synthesis
 */

import { Store } from "../memory/store.js";
import type { Block } from "../memory/chain.js";
import { GraphStore } from "./graph.js";
import { recall } from "./recall.js";
import { recallDecisionsV1 } from "../decision/recall-v1.js";

export type ReflectionMode = "daily" | "weekly" | "deep";

export interface ReflectionOptions {
  mode?: ReflectionMode;
  since?: string;       // override date window
  chain?: string;       // focus on specific chain
  useLLM?: boolean;     // use LLM for synthesis (requires provider)
  save?: boolean;       // save reflection to journal chain
  dryRun?: boolean;
}

export interface ReflectionInsight {
  type: "pattern" | "decision" | "theme" | "contradiction" | "growth";
  title: string;
  detail: string;
  evidence: string[]; // block ids or snippets
  weight: number;     // 0-1 importance
}

export interface ReflectionReport {
  mode: ReflectionMode;
  period: { from: string; to: string };
  stats: {
    journalBlocks: number;
    askBlocks: number;
    decisions: number;
    tags: Record<string, number>;
    topTags: string[];
  };
  insights: ReflectionInsight[];
  graphSummary?: {
    nodes: number;
    edges: number;
    clusters: string[][];
  };
  synthesis?: string; // LLM-generated narrative
  generatedAt: string;
  durationMs: number;
}

// ────────────────────────────────────────────────────────────────────────────

function parseWindowToMs(mode: ReflectionMode, since?: string): number {
  if (since) {
    const d = new Date(since);
    return isNaN(d.getTime()) ? 7 * 24 * 3600 * 1000 : Date.now() - d.getTime();
  }
  switch (mode) {
    case "daily":  return 24 * 3600 * 1000;
    case "weekly": return 7 * 24 * 3600 * 1000;
    case "deep":   return 30 * 24 * 3600 * 1000;
  }
}

function getWindowStart(mode: ReflectionMode, since?: string): Date {
  const ms = parseWindowToMs(mode, since);
  return new Date(Date.now() - ms);
}

function blockSnippet(block: Block): string {
  return block.data.content.slice(0, 100).replace(/\n/g, " ").trim();
}

// Count tag frequencies across blocks
function countTags(blocks: Block[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const block of blocks) {
    for (const tag of block.data.tags ?? []) {
      counts[tag] = (counts[tag] ?? 0) + 1;
    }
  }
  return counts;
}

// Find recurring words/phrases in journal content (basic NLP-lite)
function extractThemes(blocks: Block[], topN = 5): string[] {
  const stopWords = new Set([
    "the","a","an","is","was","are","were","be","been","being","have","has","had",
    "do","does","did","will","would","could","should","may","might","shall","can",
    "to","of","in","on","at","by","for","with","from","as","it","its","this","that",
    "i","my","me","we","our","you","your","he","she","they","their","and","or","but",
    "not","no","so","if","then","than","when","what","which","who","how","why","where",
    "memphis","block","chain","journal","memory","jestem","jest","się","nie","to",
    "że","w","z","na","i","do","po","przy","dla","jak","już","też","tylko","ale",
  ]);

  const freq: Record<string, number> = {};
  for (const block of blocks) {
    const words = block.data.content
      .toLowerCase()
      .replace(/[^a-z0-9ąćęłńóśźżа-я\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 3 && !stopWords.has(w));
    for (const w of words) {
      freq[w] = (freq[w] ?? 0) + 1;
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([w]) => w);
}

// Find clusters from graph (simple connected components on semantic edges)
function findClusters(nodes: { id: string }[], edges: { from: string; to: string; type: string }[]): string[][] {
  const adj = new Map<string, Set<string>>();
  for (const n of nodes) adj.set(n.id, new Set());
  for (const e of edges) {
    if (e.type !== "semantic") continue;
    adj.get(e.from)?.add(e.to);
    adj.get(e.to)?.add(e.from);
  }

  const visited = new Set<string>();
  const clusters: string[][] = [];

  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    const cluster: string[] = [];
    const queue = [node.id];
    while (queue.length) {
      const id = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      cluster.push(id);
      for (const neighbor of adj.get(id) ?? []) {
        if (!visited.has(neighbor)) queue.push(neighbor);
      }
    }
    if (cluster.length > 1) clusters.push(cluster);
  }

  return clusters.sort((a, b) => b.length - a.length);
}

// Build insights from raw data
function buildInsights(
  journalBlocks: Block[],
  askBlocks: Block[],
  decisions: any[],
  tags: Record<string, number>,
  themes: string[],
): ReflectionInsight[] {
  const insights: ReflectionInsight[] = [];

  // Top tags → themes
  const topTags = Object.entries(tags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t);

  if (topTags.length > 0) {
    insights.push({
      type: "theme",
      title: `Focus areas: ${topTags.slice(0, 3).join(", ")}`,
      detail: `Most frequent tags in this period: ${topTags.map(t => `${t} (${tags[t]}x)`).join(", ")}`,
      evidence: [],
      weight: 0.7,
    });
  }

  // Recurring word themes
  if (themes.length > 0) {
    insights.push({
      type: "theme",
      title: `Recurring concepts: ${themes.slice(0, 3).join(", ")}`,
      detail: `Words appearing most often across journal entries: ${themes.join(", ")}`,
      evidence: [],
      weight: 0.5,
    });
  }

  // Decision patterns
  if (decisions.length > 0) {
    const scopes = decisions.reduce((acc: Record<string, number>, d: any) => {
      const scope = d.scope ?? "unknown";
      acc[scope] = (acc[scope] ?? 0) + 1;
      return acc;
    }, {});
    const scopeStr = Object.entries(scopes).map(([s, n]) => `${n} ${s}`).join(", ");
    insights.push({
      type: "decision",
      title: `${decisions.length} decision(s) made`,
      detail: `Decisions by scope: ${scopeStr}. Avg confidence: ${(decisions.reduce((s: number, d: any) => s + (d.confidence ?? 0.7), 0) / decisions.length).toFixed(2)}`,
      evidence: decisions.slice(0, 3).map((d: any) => d.title),
      weight: 0.9,
    });
  }

  // Ask frequency → curiosity pattern
  if (askBlocks.length > 3) {
    insights.push({
      type: "pattern",
      title: `High curiosity period (${askBlocks.length} questions)`,
      detail: `You asked Memphis ${askBlocks.length} questions in this period — signs of active exploration.`,
      evidence: askBlocks.slice(0, 2).map(blockSnippet),
      weight: 0.6,
    });
  }

  // Journal velocity
  if (journalBlocks.length > 0) {
    const latest = journalBlocks[journalBlocks.length - 1];
    const earliest = journalBlocks[0];
    const daySpan = Math.max(1, (new Date(latest.timestamp).getTime() - new Date(earliest.timestamp).getTime()) / (24 * 3600 * 1000));
    const velocity = journalBlocks.length / daySpan;

    if (velocity > 5) {
      insights.push({
        type: "pattern",
        title: "High journaling velocity",
        detail: `~${velocity.toFixed(1)} entries/day — intensive activity period.`,
        evidence: [],
        weight: 0.5,
      });
    }
  }

  // Low confidence decisions → contradiction hint
  const lowConfidence = decisions.filter((d: any) => (d.confidence ?? 1) < 0.6);
  if (lowConfidence.length > 0) {
    insights.push({
      type: "contradiction",
      title: `${lowConfidence.length} low-confidence decision(s)`,
      detail: `These may need revisiting: ${lowConfidence.map((d: any) => d.title).join("; ")}`,
      evidence: lowConfidence.map((d: any) => d.title),
      weight: 0.8,
    });
  }

  return insights.sort((a, b) => b.weight - a.weight);
}

// ────────────────────────────────────────────────────────────────────────────

export async function reflect(store: Store, options: ReflectionOptions = {}): Promise<ReflectionReport> {
  const start = Date.now();
  const mode = options.mode ?? "weekly";
  const windowStart = getWindowStart(mode, options.since);
  const windowEnd = new Date();

  // Load blocks in window
  const chains = options.chain ? [options.chain] : store.listChains().filter(c => c !== "vault" && c !== "credential");

  const allBlocks: Block[] = [];
  for (const chain of chains) {
    const blocks = store.readChain(chain).filter(
      b => new Date(b.timestamp) >= windowStart
    );
    allBlocks.push(...blocks);
  }

  const journalBlocks = allBlocks.filter(b => b.data.type === "journal");
  const askBlocks = allBlocks.filter(b => b.data.type === "ask");

  // Decisions in window
  const allDecisions = recallDecisionsV1(store, {});
  const decisions = allDecisions.filter(
    (d: any) => d.createdAt && new Date(d.createdAt) >= windowStart
  );

  // Tag analysis
  const tags = countTags(allBlocks);
  const topTags = Object.entries(tags)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([t]) => t);

  // Theme extraction
  const themes = extractThemes(journalBlocks);

  // Graph analysis
  let graphSummary: ReflectionReport["graphSummary"] | undefined;
  try {
    const graphStore = new GraphStore();
    const meta = graphStore.loadMeta();
    if (meta) {
      const { nodes, edges } = graphStore.query({ chain: options.chain, minScore: 0.7 });
      const clusters = findClusters(nodes, edges);
      graphSummary = {
        nodes: meta.nodes,
        edges: meta.edges,
        clusters: clusters.slice(0, 5),
      };
    }
  } catch {
    // graph not built yet — skip
  }

  // Build insights
  const insights = buildInsights(journalBlocks, askBlocks, decisions, tags, themes);

  const report: ReflectionReport = {
    mode,
    period: { from: windowStart.toISOString(), to: windowEnd.toISOString() },
    stats: {
      journalBlocks: journalBlocks.length,
      askBlocks: askBlocks.length,
      decisions: decisions.length,
      tags,
      topTags,
    },
    insights,
    graphSummary,
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - start,
  };

  // Save to journal chain
  if (options.save && !options.dryRun) {
    const summary = `[reflection:${mode}] period=${windowStart.toISOString().slice(0,10)}..${windowEnd.toISOString().slice(0,10)} journal=${journalBlocks.length} ask=${askBlocks.length} decisions=${decisions.length} insights=${insights.length}`;
    store.appendBlock("journal", {
      type: "journal",
      content: summary,
      tags: ["reflection", mode, "auto"],
    });
  }

  return report;
}
