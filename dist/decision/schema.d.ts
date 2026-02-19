import { z } from "zod";
/**
 * Decision Schema v1 (Memphis Cognitive Engine)
 *
 * Design goals:
 * - Works for BOTH conscious (A) and inferred (B) decisions
 * - Append-only friendly (revisions are new blocks)
 * - LLM-friendly fields (options, reasoning, confidence, evidence)
 */
export declare const DECISION_SCHEMA_VERSION: "decision:v1";
export declare const DecisionModeSchema: z.ZodEnum<{
    conscious: "conscious";
    inferred: "inferred";
}>;
export type DecisionMode = z.infer<typeof DecisionModeSchema>;
export declare const DecisionStatusSchema: z.ZodEnum<{
    active: "active";
    revised: "revised";
    deprecated: "deprecated";
}>;
export type DecisionStatus = z.infer<typeof DecisionStatusSchema>;
export declare const ImpactScopeSchema: z.ZodEnum<{
    personal: "personal";
    project: "project";
    life: "life";
}>;
export type ImpactScope = z.infer<typeof ImpactScopeSchema>;
export declare const DecisionEvidenceSchema: z.ZodObject<{
    refs: z.ZodDefault<z.ZodArray<z.ZodString>>;
    note: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const DecisionSchemaV1: z.ZodObject<{
    schema: z.ZodLiteral<"decision:v1">;
    decisionId: z.ZodString;
    recordId: z.ZodString;
    createdAt: z.ZodString;
    mode: z.ZodEnum<{
        conscious: "conscious";
        inferred: "inferred";
    }>;
    status: z.ZodDefault<z.ZodEnum<{
        active: "active";
        revised: "revised";
        deprecated: "deprecated";
    }>>;
    scope: z.ZodDefault<z.ZodEnum<{
        personal: "personal";
        project: "project";
        life: "life";
    }>>;
    title: z.ZodString;
    context: z.ZodDefault<z.ZodString>;
    options: z.ZodArray<z.ZodString>;
    chosen: z.ZodString;
    reasoning: z.ZodDefault<z.ZodString>;
    confidence: z.ZodDefault<z.ZodNumber>;
    links: z.ZodDefault<z.ZodArray<z.ZodString>>;
    evidence: z.ZodOptional<z.ZodObject<{
        refs: z.ZodDefault<z.ZodArray<z.ZodString>>;
        note: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    supersedes: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type DecisionV1 = z.infer<typeof DecisionSchemaV1>;
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
    evidence?: {
        refs?: string[];
        note?: string;
    };
    decisionId?: string;
    supersedes?: string;
}
/** Create a validated decision object that can be stored in BlockData.content (JSON). */
export declare function createDecisionV1(input: CreateDecisionInput): DecisionV1;
/** Parse and validate a stored decision JSON string. */
export declare function parseDecisionV1(json: string): DecisionV1;
