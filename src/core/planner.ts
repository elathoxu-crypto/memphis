/**
 * Planner — generates actionable coding tasks from Memphis context
 *
 * Pipeline:
 *   graph + reflect + decisions → structured task → codex exec
 *
 * Output formats:
 *   --output prompt   → plain text prompt for codex exec
 *   --output json     → structured task object
 *   --output shell    → ready-to-run codex command
 */

import { Store } from "../memory/store.js";
import { GraphStore } from "./graph.js";
import { reflect } from "./reflection.js";
import { recallDecisionsV1 } from "../decision/recall-v1.js";

export type PlanOutputFormat = "prompt" | "json" | "shell";

export interface PlanOptions {
  focus?: string;        // file or module to focus on (e.g. "openclaw.ts")
  goal?: string;         // explicit goal override
  since?: string;        // memory window
  output?: PlanOutputFormat;
  maxContext?: number;   // max context blocks to include
}

export interface PlanTask {
  title: string;
  goal: string;
  context: string;       // decisions + insights that inform the task
  focusFiles: string[];
  actions: string[];     // concrete steps
  codexPrompt: string;   // ready-to-use prompt for codex
}

// ─── Heuristics: extract focus files from graph ─────────────────────────────

function extractFocusFiles(graphStore: GraphStore, focus?: string): string[] {
  if (!focus) return [];

  const { nodes } = graphStore.query({ chain: "journal" });
  // find nodes whose snippet mentions the focus
  const relevant = nodes
    .filter(n => n.snippet.toLowerCase().includes(focus.toLowerCase()))
    .map(n => focus)
    .slice(0, 5);

  return focus ? [focus, ...relevant].filter((v, i, a) => a.indexOf(v) === i) : [];
}

// ─── Build prompt ────────────────────────────────────────────────────────────

function buildCodexPrompt(task: Omit<PlanTask, "codexPrompt">): string {
  const lines: string[] = [];

  lines.push(`# Task: ${task.title}`);
  lines.push(`\n## Goal\n${task.goal}`);

  if (task.context) {
    lines.push(`\n## Context (from Memphis memory)\n${task.context}`);
  }

  if (task.focusFiles.length) {
    lines.push(`\n## Focus files\n${task.focusFiles.map(f => `- ${f}`).join("\n")}`);
  }

  if (task.actions.length) {
    lines.push(`\n## Steps\n${task.actions.map((a, i) => `${i + 1}. ${a}`).join("\n")}`);
  }

  lines.push(`\n## Rules\n- Keep all existing tests passing\n- Run \`npm run build\` after changes\n- Commit with descriptive message`);
  lines.push(`\nWhen completely finished, run:\nopenclaw system event --text "Done: ${task.title}" --mode now`);

  return lines.join("\n");
}

// ─── Main ────────────────────────────────────────────────────────────────────

export async function plan(store: Store, options: PlanOptions = {}): Promise<PlanTask> {
  const graphStore = new GraphStore();

  // 1. Reflection — what does Memphis think needs attention?
  const report = await reflect(store, {
    mode: "weekly",
    since: options.since,
  });

  // 2. Decisions — what was decided architecturally?
  const decisions = recallDecisionsV1(store, { limit: 5 });

  // 3. Graph — find clusters and isolated nodes
  const graphMeta = graphStore.loadMeta();
  const clusters = report.graphSummary?.clusters ?? [];

  // 4. Build context string
  const contextParts: string[] = [];

  if (decisions.length) {
    contextParts.push("**Recent decisions:**");
    for (const d of decisions.slice(0, 3) as any[]) {
      contextParts.push(`- ${d.title}: chose "${d.chosen}" (${d.scope})`);
    }
  }

  if (report.insights.length) {
    contextParts.push("\n**Insights from reflection:**");
    for (const ins of report.insights.slice(0, 3)) {
      contextParts.push(`- [${ins.type}] ${ins.title}: ${ins.detail}`);
    }
  }

  if (graphMeta) {
    contextParts.push(`\n**Knowledge graph:** ${graphMeta.nodes} nodes, ${graphMeta.edges} edges`);
    if (clusters.length) {
      contextParts.push(`Connected clusters: ${clusters.length}`);
    }
  }

  // 5. Determine focus files
  const focusFiles = extractFocusFiles(graphStore, options.focus);
  if (options.focus && !focusFiles.includes(options.focus)) {
    focusFiles.unshift(options.focus);
  }

  // 6. Generate goal + actions
  const goal = options.goal ?? deriveGoal(report, options.focus);
  const actions = deriveActions(report, options.focus);

  const title = options.focus
    ? `Refactor ${options.focus}`
    : `Memphis improvement (${new Date().toISOString().slice(0, 10)})`;

  const task: Omit<PlanTask, "codexPrompt"> = {
    title,
    goal,
    context: contextParts.join("\n"),
    focusFiles,
    actions,
  };

  return {
    ...task,
    codexPrompt: buildCodexPrompt(task),
  };
}

function deriveGoal(report: Awaited<ReturnType<typeof reflect>>, focus?: string): string {
  if (focus) {
    return `Refactor ${focus} to improve clarity, reduce complexity, and add missing tests.`;
  }

  const topInsight = report.insights[0];
  if (topInsight?.type === "contradiction") {
    return `Resolve low-confidence decisions: ${topInsight.detail}`;
  }
  if (topInsight?.type === "pattern") {
    return `Address detected pattern: ${topInsight.title}`;
  }

  return `Improve code quality based on recent activity: ${report.stats.topTags.slice(0, 3).join(", ")}`;
}

function deriveActions(report: Awaited<ReturnType<typeof reflect>>, focus?: string): string[] {
  const actions: string[] = [];

  if (focus) {
    actions.push(`Read and understand ${focus} fully before changing anything`);
    actions.push(`Identify responsibilities — split if > 300 lines or > 3 concerns`);
    actions.push(`Write or update tests for changed code`);
    actions.push(`Run \`npm run build && npx vitest run\` — all tests must pass`);
    actions.push(`Commit with descriptive message`);
    return actions;
  }

  // Generic actions from insights
  for (const insight of report.insights.slice(0, 3)) {
    if (insight.type === "contradiction") {
      actions.push(`Review and resolve: ${insight.title}`);
    } else if (insight.type === "pattern" && insight.title.includes("velocity")) {
      actions.push(`Add missing tests for recently added code`);
    }
  }

  actions.push(`Run full test suite: \`npx vitest run\``);
  actions.push(`Update docs if public API changed`);

  return actions.length ? actions : ["Review codebase and improve as needed"];
}
