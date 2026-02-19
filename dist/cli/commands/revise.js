import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { loadConfig } from "../../config/loader.js";
import { Store } from "../../memory/store.js";
import { log } from "../../utils/logger.js";
import { safeParseDecisionV1 } from "../../decision/decision-v1.js";
function randomId() {
    return crypto.randomBytes(12).toString("hex");
}
function getGitRoot(cwd) {
    try {
        const res = spawnSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8" });
        if (res.status === 0) {
            const out = (res.stdout ?? "").toString().trim();
            return out || undefined;
        }
    }
    catch {
        // ignore
    }
    return undefined;
}
function findLatestDecision(blocks, decisionId) {
    const matches = [];
    for (const block of blocks) {
        if (block?.data?.type !== "decision")
            continue;
        const parsed = safeParseDecisionV1(block.data.content);
        if (!parsed.ok)
            continue;
        if (parsed.value.decisionId === decisionId) {
            matches.push({ block, decision: parsed.value });
        }
    }
    if (matches.length === 0)
        return null;
    matches.sort((a, b) => (b.decision.createdAt || "").localeCompare(a.decision.createdAt || ""));
    return matches[0];
}
export async function reviseCommand(decisionId, opts) {
    const id = decisionId.trim();
    if (!id) {
        log.error("decisionId is required");
        return;
    }
    const config = loadConfig();
    const store = new Store(config.memory.path);
    const blocks = store.readChain("decisions");
    const found = findLatestDecision(blocks, id);
    if (!found) {
        log.warn(`Decision not found: ${id}`);
        return;
    }
    const now = new Date().toISOString();
    const cwd = process.cwd();
    const gitRoot = getGitRoot(cwd);
    const status = (opts.status?.trim().toLowerCase() || "revised");
    const revised = {
        ...found.decision,
        recordId: randomId(),
        createdAt: now,
        title: (opts.title ?? found.decision.title).trim(),
        reasoning: opts.reason.trim(),
        mode: "conscious",
        status,
        supersedes: found.decision.recordId,
        confidence: 0.85,
        metadata: {
            ...(found.decision.metadata ?? {}),
            projectPath: cwd,
            gitRoot,
            source: "cli:revise",
        },
    };
    store.addBlock("decisions", {
        type: "decision",
        content: JSON.stringify(revised),
        tags: ["decision", revised.mode, revised.scope, revised.status].filter(Boolean),
        agent: "revise",
    });
    log.info(`Revised decision ${revised.decisionId} (supersedes ${found.decision.recordId})`);
}
//# sourceMappingURL=revise.js.map