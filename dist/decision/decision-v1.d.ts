import { z } from "zod";
/**
 * Minimal Decision v1 parser for recall/show/revise.
 *
 * We intentionally keep it tolerant (passthrough) so it can evolve.
 */
export declare const DecisionV1Schema: z.ZodObject<{
    schema: z.ZodOptional<z.ZodString>;
    decisionId: z.ZodString;
    recordId: z.ZodString;
    createdAt: z.ZodString;
    title: z.ZodString;
    reasoning: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    mode: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        conscious: "conscious";
        inferred: "inferred";
    }>>>;
    status: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        active: "active";
        revised: "revised";
        deprecated: "deprecated";
    }>>>;
    scope: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        personal: "personal";
        project: "project";
        life: "life";
    }>>>;
    supersedes: z.ZodOptional<z.ZodString>;
    confidence: z.ZodOptional<z.ZodNumber>;
    links: z.ZodOptional<z.ZodArray<z.ZodString>>;
    metadata: z.ZodOptional<z.ZodObject<{
        projectPath: z.ZodOptional<z.ZodString>;
        gitRoot: z.ZodOptional<z.ZodString>;
        source: z.ZodOptional<z.ZodString>;
        hostname: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$loose>;
export type DecisionV1 = z.infer<typeof DecisionV1Schema>;
export declare function parseDecisionV1(json: string): DecisionV1;
export declare function safeParseDecisionV1(json: string): {
    ok: true;
    value: DecisionV1;
} | {
    ok: false;
    error: string;
};
