import { loadConfig } from "../../config/loader.js";
import { Store } from "../../memory/store.js";
import { log } from "../../utils/logger.js";
import { safeParseDecisionV1, type DecisionV1 } from "../../decision/decision-v1.js";

function pretty(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

function findDecision(blocks: any[], id: string): { block: any; decision: DecisionV1 } | null {
  const needle = id.trim();

  // 1) Try recordId exact
  for (const block of blocks) {
    if (block?.data?.type !== "decision") continue;
    const parsed = safeParseDecisionV1(block.data.content);
    if (!parsed.ok) continue;
    if (parsed.value.recordId === needle) return { block, decision: parsed.value };
  }

  // 2) Try decisionId exact
  for (const block of blocks) {
    if (block?.data?.type !== "decision") continue;
    const parsed = safeParseDecisionV1(block.data.content);
    if (!parsed.ok) continue;
    if (parsed.value.decisionId === needle) return { block, decision: parsed.value };
  }

  // 3) Try decisionId prefix
  for (const block of blocks) {
    if (block?.data?.type !== "decision") continue;
    const parsed = safeParseDecisionV1(block.data.content);
    if (!parsed.ok) continue;
    if (parsed.value.decisionId.startsWith(needle)) return { block, decision: parsed.value };
  }

  return null;
}

export async function showCommand(kind: string, id: string) {
  const k = kind.trim().toLowerCase();
  if (k !== "decision") {
    log.error(`Unsupported kind: ${kind}. Only 'decision' is supported.`);
    return;
  }

  const config = loadConfig();
  const store = new Store(config.memory.path);

  const blocks = store.readChain("decisions");
  const found = findDecision(blocks as any[], id);

  if (!found) {
    log.warn(`Decision not found: ${id}`);
    return;
  }

  // Full, readable output
  const { decision, block } = found;
  console.log(pretty({
    decision,
    block: {
      chain: block.chain,
      index: block.index,
      timestamp: block.timestamp,
      hash: block.hash,
      prev_hash: block.prev_hash,
      tags: block.data.tags,
      agent: block.data.agent,
    },
  }));
}
