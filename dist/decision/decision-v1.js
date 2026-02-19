import { z } from "zod";
/**
 * Minimal Decision v1 parser for recall/show/revise.
 *
 * We intentionally keep it tolerant (passthrough) so it can evolve.
 */
export const DecisionV1Schema = z
    .object({
    schema: z.string().optional(),
    decisionId: z.string(),
    recordId: z.string(),
    createdAt: z.string(),
    title: z.string(),
    reasoning: z.string().optional().default(""),
    mode: z.enum(["conscious", "inferred"]).optional().default("conscious"),
    status: z.enum(["active", "revised", "deprecated"]).optional().default("active"),
    scope: z.enum(["personal", "project", "life"]).optional().default("personal"),
    supersedes: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    links: z.array(z.string()).optional(),
    // Optional metadata envelope (recommended)
    metadata: z
        .object({
        projectPath: z.string().optional(),
        gitRoot: z.string().optional(),
        source: z.string().optional(),
        hostname: z.string().optional(),
    })
        .optional(),
})
    .passthrough();
export function parseDecisionV1(json) {
    const parsed = JSON.parse(json);
    return DecisionV1Schema.parse(parsed);
}
export function safeParseDecisionV1(json) {
    try {
        return { ok: true, value: parseDecisionV1(json) };
    }
    catch (err) {
        return { ok: false, error: String(err) };
    }
}
//# sourceMappingURL=decision-v1.js.map