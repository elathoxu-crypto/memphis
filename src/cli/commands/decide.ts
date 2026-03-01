import { log } from "../../utils/logger.js";
import { memphis } from "../../agents/logger.js";
import { createDecisionV1 } from "../../decision/schema.js";
import { createWorkspaceStore } from "../utils/workspace-store.js";

export interface DecideOptions {
  /** pipe-separated list, e.g. "A|B|C" */
  options?: string;
  /** must match one of the options */
  chosen?: string;
  why?: string;
  context?: string;
  tags?: string;
  links?: string;
  confidence?: string;
  mode?: "conscious" | "inferred";
  scope?: "personal" | "project" | "life";
  status?: "active" | "revised" | "deprecated";
  decisionId?: string;
  supersedes?: string;
  evidenceRefs?: string;
  evidenceNote?: string;
}

function splitPipe(s?: string): string[] {
  if (!s) return [];
  return s
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function decideCommand(title: string, opts: DecideOptions) {
  const { guard } = createWorkspaceStore();

  const options = splitPipe(opts.options);
  const chosen = (opts.chosen ?? "").trim();

  // If no options provided, create single-option decision (frictionless mode)
  if (options.length === 0) {
    if (!chosen) {
      throw new Error("Either --options or <chosen> is required");
    }
    // Auto-generate options: [chosen, "keep current direction"]
    options.push(chosen, "keep current direction");
  }
  
  if (!chosen) {
    throw new Error("<chosen> argument is required");
  }

  const tags = opts.tags ? opts.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const links = opts.links ? opts.links.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const confidence = opts.confidence !== undefined ? Number(opts.confidence) : undefined;
  if (confidence !== undefined && Number.isNaN(confidence)) {
    throw new Error("--confidence must be a number between 0 and 1");
  }

  const decision = createDecisionV1({
    title,
    options,
    chosen,
    reasoning: opts.why ?? "",
    context: opts.context ?? "",
    links,
    confidence,
    mode: opts.mode,
    scope: opts.scope,
    status: opts.status,
    decisionId: opts.decisionId,
    supersedes: opts.supersedes,
    evidence: opts.mode === "inferred" ? { refs: splitPipe(opts.evidenceRefs), note: opts.evidenceNote } : undefined,
  });

  const block = await guard.appendBlock("decisions", {
    type: "decision",
    content: JSON.stringify(decision),
    tags: ["decision", decision.mode, decision.scope, decision.status, ...tags].filter(Boolean),
    agent: "decide",
  });

  log.block("decisions", block.index, block.hash);
  log.info(`Decision saved: ${decision.decisionId} (${decision.mode}, ${decision.status}, ${decision.scope})`);
  log.info(`Title: ${decision.title}`);
  log.info(`Chosen: ${decision.chosen}`);

  memphis.cmd("decide", "ok");
}
