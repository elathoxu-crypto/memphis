import { z } from "zod";
import crypto from "node:crypto";

/**
 * Decision Schema v1 (Memphis Cognitive Engine)
 *
 * Design goals:
 * - Works for BOTH conscious (A) and inferred (B) decisions
 * - Append-only friendly (revisions are new blocks)
 * - LLM-friendly fields (options, reasoning, confidence, evidence)
 */

export const DECISION_SCHEMA_VERSION = "decision:v1" as const;

export const DecisionModeSchema = z.enum(["conscious", "inferred"]);
export type DecisionMode = z.infer<typeof DecisionModeSchema>;

export const DecisionStatusSchema = z.enum(["active", "revised", "deprecated"]);
export type DecisionStatus = z.infer<typeof DecisionStatusSchema>;

export const ImpactScopeSchema = z.enum(["personal", "project", "life"]);
export type ImpactScope = z.infer<typeof ImpactScopeSchema>;

export const DecisionEvidenceSchema = z.object({
  /** machine-readable evidence references (e.g. commit SHAs, file paths, URLs, hashes, etc.) */
  refs: z.array(z.string()).default([]),
  /** short natural language note about the evidence */
  note: z.string().optional(),
});

export const DecisionSchemaV1 = z.object({
  schema: z.literal(DECISION_SCHEMA_VERSION),

  /** stable id across revisions (same decisionId is reused when revising) */
  decisionId: z.string().min(8),
  /** unique id for this specific record (new for each revision) */
  recordId: z.string().min(8),
  createdAt: z.string().datetime(),

  mode: DecisionModeSchema,
  status: DecisionStatusSchema.default("active"),
  scope: ImpactScopeSchema.default("personal"),

  title: z.string().min(1),
  context: z.string().default(""),

  options: z.array(z.string().min(1)).min(1),
  chosen: z.string().min(1),
  reasoning: z.string().default(""),

  /** confidence from the human or system (0..1) */
  confidence: z.number().min(0).max(1).default(0.7),

  /** links to other decisionIds (causal / dependency / contradiction) */
  links: z.array(z.string()).default([]),

  /** optional evidence for inferred decisions */
  evidence: DecisionEvidenceSchema.optional(),

  /** when revising/overriding, reference previous recordId */
  supersedes: z.string().optional(),
});

export type DecisionV1 = z.infer<typeof DecisionSchemaV1>;

function stableIdFromTitle(title: string): string {
  // Deterministic-ish id: short hash of title + day bucket.
  // (Keeps ids stable even without a DB; good enough for local personal use.)
  const day = new Date().toISOString().slice(0, 10);
  return crypto.createHash("sha256").update(`${day}:${title}`).digest("hex").slice(0, 16);
}

function randomId(): string {
  return crypto.randomBytes(12).toString("hex");
}

export interface CreateDecisionInput {
  title: string;
  options: string[];
  chosen: string;
  mode?: DecisionMode;
  status?: DecisionStatus;
  scope?: ImpactScope;
  context?: string;
  reasoning?: string;
  confidence?: number;
  links?: string[];
  evidence?: { refs?: string[]; note?: string };
  decisionId?: string;
  supersedes?: string;
}

/** Create a validated decision object that can be stored in BlockData.content (JSON). */
export function createDecisionV1(input: CreateDecisionInput): DecisionV1 {
  const now = new Date().toISOString();
  const decisionId = (input.decisionId?.trim() || stableIdFromTitle(input.title)).toLowerCase();

  const obj: DecisionV1 = DecisionSchemaV1.parse({
    schema: DECISION_SCHEMA_VERSION,
    decisionId,
    recordId: randomId(),
    createdAt: now,

    mode: input.mode ?? "conscious",
    status: input.status ?? "active",
    scope: input.scope ?? "personal",

    title: input.title,
    context: input.context ?? "",

    options: input.options,
    chosen: input.chosen,
    reasoning: input.reasoning ?? "",
    confidence: input.confidence ?? 0.7,

    links: input.links ?? [],
    evidence: input.evidence ? { refs: input.evidence.refs ?? [], note: input.evidence.note } : undefined,
    supersedes: input.supersedes,
  });

  // Guardrail: chosen must be one of the options (normalized compare)
  const norm = (s: string) => s.trim().toLowerCase();
  const chosenOk = obj.options.map(norm).includes(norm(obj.chosen));
  if (!chosenOk) {
    throw new Error(`Chosen option must be one of: ${obj.options.join(", ")}`);
  }

  return obj;
}

/** Parse and validate a stored decision JSON string. */
export function parseDecisionV1(json: string): DecisionV1 {
  const parsed = JSON.parse(json);
  return DecisionSchemaV1.parse(parsed);
}
