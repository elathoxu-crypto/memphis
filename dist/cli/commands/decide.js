import { Store } from "../../memory/store.js";
import { loadConfig } from "../../config/loader.js";
import { log } from "../../utils/logger.js";
import { memphis } from "../../agents/logger.js";
import { createDecisionV1 } from "../../decision/schema.js";
function splitPipe(s) {
    if (!s)
        return [];
    return s
        .split("|")
        .map((x) => x.trim())
        .filter(Boolean);
}
export async function decideCommand(title, opts) {
    const config = loadConfig();
    const store = new Store(config.memory.path);
    const options = splitPipe(opts.options);
    const chosen = (opts.chosen ?? "").trim();
    if (options.length === 0) {
        throw new Error("--options is required (pipe-separated), e.g. --options \"A|B|C\"");
    }
    if (!chosen) {
        throw new Error("--chosen is required and must match one of the options");
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
    const block = store.addBlock("decisions", {
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
//# sourceMappingURL=decide.js.map