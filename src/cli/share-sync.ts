import chalk from "chalk";
import fs from "fs/promises";
import path from "path";
import { Store } from "../memory/store.js";
import { loadConfig } from "../config/loader.js";
import { PinataBridge } from "../integrations/pinata.js";
import { z } from "zod";

/**
 * Memphis Share Sync (skeleton)
 * ------------------------------------
 * MVP scope:
 *  - export share-tagged blocks (push)
 *  - append CID entries to local network-chain log
 *  - pull new CIDs via gateway + import into local store
 *  - optional cleanup of old pins / entries
 *
 * NOTE: This file is only a scaffold for Codex 5.1 implementation.
 */

const NETWORK_CHAIN_FILE = path.join(process.env.HOME ?? ".", ".memphis", "network-chain.jsonl");

export interface NetworkEntry {
  cid: string;
  agent: string;
  timestamp: string;
  chain: string;
  index: number;
  tags?: string[];
  status?: "pinned" | "imported" | "unavailable" | "ignored";
}

export interface ShareSyncOptions {
  push?: boolean;
  pull?: boolean;
  all?: boolean;
  cleanup?: boolean;
  limit?: number;
  since?: string;
  dryRun?: boolean;
  pushDisabled?: boolean;
}

const sharePayloadSchema = z.object({
  agent: z.string(),
  timestamp: z.string(),
  chain: z.string(),
  index: z.number(),
  tags: z.array(z.string()).optional(),
  content: z.string().max(2048),
  meta: z.record(z.any()).optional(),
});

export type SharePayload = z.infer<typeof sharePayloadSchema>;

export async function shareSyncCommand(opts: ShareSyncOptions = {}): Promise<void> {
  const config = loadConfig();
  const store = new Store(config.memory.path);
  const limit = opts.limit ?? 10;
  const since = opts.since;
  const dryRun = Boolean(opts.dryRun);

  const shouldPush = Boolean((opts.all && !opts.pushDisabled) || (opts.push && !opts.pushDisabled));
  const shouldPull = Boolean(opts.all || opts.pull);
  const shouldCleanup = Boolean(opts.cleanup);

  if (!shouldPush && !shouldPull && !shouldCleanup) {
    console.log(chalk.gray("[share-sync] nothing to do (no flags provided)"));
    return;
  }

  if (shouldPush) {
    const payloads = await exportShareBlocks(store, limit, since);
    if (payloads.length === 0) {
      console.log(chalk.gray("[share-sync] no share-tagged blocks to push"));
    } else if (dryRun) {
      console.log(chalk.yellow(`[share-sync] DRY RUN: would push ${payloads.length} blocks`));
    } else {
      try {
        const pinata = createPinataBridge();
        for (const payload of payloads) {
          try {
            const cid = await pinata.pinJSON(payload as any);
            console.log(chalk.green(`[share-sync] pushed ${payload.chain}#${payload.index} → ${cid}`));
            await appendNetworkEntry({
              cid,
              agent: payload.agent,
              timestamp: new Date().toISOString(),
              chain: payload.chain,
              index: payload.index,
              tags: payload.tags,
              status: "pinned",
            });
          } catch (err) {
            console.error(chalk.red(`[share-sync] failed to push ${payload.chain}#${payload.index}: ${err}`));
          }
        }
      } catch (err) {
        console.error(chalk.red(`[share-sync] pinata config error: ${err}`));
      }
    }
  }

  if (shouldPull) {
    const entries = await readNetworkEntries({ sort: "desc", unique: true });
    const pending = entries.filter((entry) => entry.status !== "imported" && entry.status !== "unavailable");
    if (pending.length === 0) {
      console.log(chalk.gray("[share-sync] no pending network entries to pull"));
    } else if (dryRun) {
      console.log(chalk.yellow(`[share-sync] DRY RUN: would pull ${Math.min(limit, pending.length)} entries`));
    } else {
      const toProcess = pending.slice(0, Math.max(0, limit)).reverse();
      for (const entry of toProcess) {
        console.log(chalk.blue(`[share-sync] pulling ${entry.cid} (${entry.chain}#${entry.index})`));
        const payload = await fetchShareCid(entry.cid);
        if (!payload) {
          await appendNetworkEntry({ ...entry, timestamp: new Date().toISOString(), status: "unavailable" });
          continue;
        }
        try {
          const blockIndex = await importShareBlock(store, payload);
          await appendNetworkEntry({ ...entry, timestamp: new Date().toISOString(), status: "imported" });
          console.log(chalk.green(`[share-sync] imported ${entry.cid} → share#${String(blockIndex).padStart(6, "0")}`));
        } catch (err) {
          console.error(chalk.red(`[share-sync] failed to import ${entry.cid}: ${err}`));
        }
      }
    }
  }

  if (shouldCleanup) {
    if (dryRun) {
      console.log(chalk.yellow("[share-sync] DRY RUN: cleanup skipped"));
    } else {
      try {
        const pinata = createPinataBridge();
        const removedPins = await pinata.cleanupOldPins();
        const removedEntries = await cleanupNetworkEntries();
        console.log(chalk.green(`[share-sync] cleanup removed ${removedPins} pins, ${removedEntries} network entries`));
      } catch (err) {
        console.error(chalk.red(`[share-sync] cleanup failed: ${err}`));
      }
    }
  }
}

/**
 * Export lightweight blocks tagged as `share`. Implementation idea:
 *  1. iterate over chains (journal/thoughts/ask/etc.)
 *  2. filter blocks containing tag `share`
 *  3. map to SharePayload JSON (≤2KB)
 */
export async function exportShareBlocks(store: Store, limit = 10, since?: string): Promise<SharePayload[]> {
  const excludedChains = new Set(["vault", "share", ".internal"]);
  const chains = store.listChains().filter((chain) => {
    if (excludedChains.has(chain)) return false;
    if (chain.startsWith(".")) return false;
    return true;
  });

  const sinceDate = since ? new Date(since) : null;
  const candidates: SharePayload[] = [];

  for (const chain of chains) {
    const blocks = store.readChain(chain);
    for (const block of blocks) {
      const tags = block.data.tags || [];
      if (!tags.includes("share")) continue;
      if (sinceDate && !isNaN(sinceDate.getTime())) {
        const blockTime = new Date(block.timestamp);
        if (isNaN(blockTime.getTime()) || blockTime < sinceDate) continue;
      }
      const rawContent = block.data.content || JSON.stringify(block.data.data || {});
      if (!rawContent) continue;
      let content = rawContent;
      if (content.length > 2048) {
        content = content.slice(0, 2045) + "...";
      }
      const payload: SharePayload = {
        agent: block.data.agent || "unknown",
        timestamp: block.timestamp,
        chain,
        index: block.index,
        tags,
        content,
        meta: {
          type: block.data.type,
          sourceId: `${chain}#${String(block.index).padStart(6, "0")}`,
        },
      };
      candidates.push(payload);
    }
  }

  candidates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const limited = candidates.slice(0, Math.max(0, limit));
  limited.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return limited;
}

/**
 * Append entry to local network chain log. Uses JSONL for easy diffing.
 */
export async function appendNetworkEntry(entry: NetworkEntry): Promise<void> {
  const normalized: NetworkEntry = {
    ...entry,
    status: entry.status ?? "pinned",
  };
  const line = JSON.stringify(normalized);
  await fs.mkdir(path.dirname(NETWORK_CHAIN_FILE), { recursive: true });
  await fs.appendFile(NETWORK_CHAIN_FILE, line + "\n", "utf-8");
}

/**
 * Read existing network entries (latest first optional).
 */
export interface ReadNetworkOptions {
  sort?: "asc" | "desc";
  unique?: boolean;
}

export async function readNetworkEntries(options: ReadNetworkOptions = {}): Promise<NetworkEntry[]> {
  const { sort = "asc", unique = false } = options;
  try {
    const data = await fs.readFile(NETWORK_CHAIN_FILE, "utf-8");
    let entries = data
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as NetworkEntry);

    entries.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeA - timeB;
    });

    if (sort === "desc") {
      entries = entries.reverse();
    }

    if (unique) {
      const seen = new Set<string>();
      const deduped: NetworkEntry[] = [];
      for (const entry of entries) {
        if (seen.has(entry.cid)) continue;
        seen.add(entry.cid);
        deduped.push(entry);
      }
      entries = deduped;
    }

    return entries;
  } catch (err: any) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

/**
 * Fetch CID via Pinata gateway and return SharePayload payload.
 */
export async function fetchShareCid(cid: string): Promise<SharePayload | null> {
  const url = `https://gateway.pinata.cloud/ipfs/${cid}`;
  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.warn(chalk.yellow(`[share-sync] Failed to fetch ${cid}: ${response.status}`));
      return null;
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > 4096) {
      console.warn(chalk.yellow(`[share-sync] ${cid} payload exceeds 4KB limit (${buffer.byteLength} bytes)`));
      return null;
    }

    const text = Buffer.from(buffer).toString("utf-8");
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      console.warn(chalk.yellow(`[share-sync] ${cid} invalid JSON`));
      return null;
    }

    const result = sharePayloadSchema.safeParse(data);
    if (!result.success) {
      console.warn(chalk.yellow(`[share-sync] ${cid} failed schema validation: ${result.error.message}`));
      return null;
    }

    return result.data;
  } catch (err) {
    console.warn(chalk.yellow(`[share-sync] Fetch error for ${cid}: ${err}`));
    return null;
  }
}

/**
 * Import remote block into local Memphis store (share chain + tag `remote`).
 */
export async function importShareBlock(store: Store, payload: SharePayload): Promise<number> {
  const tags = new Set(["share", "remote"]);
  (payload.tags || []).forEach((tag) => tags.add(tag));

  const block = await store.appendBlock("share", {
    type: "journal",
    content: payload.content,
    tags: Array.from(tags),
    agent: payload.agent,
    context_refs: [
      {
        chain: payload.chain,
        index: payload.index,
        score: 1,
      },
    ],
    data: {
      sourceChain: payload.chain,
      sourceIndex: payload.index,
      cidMeta: payload.meta,
    },
  });

  return block.index;
}

/**
 * Instantiate Pinata bridge (JWT from config/env).
 */
export function createPinataBridge(): PinataBridge {
  const config = loadConfig();
  const pinataCfg = config.integrations?.pinata || {};
  const jwt = pinataCfg.jwt || process.env.PINATA_JWT || undefined;
  const apiKey = pinataCfg.apiKey || process.env.PINATA_API_KEY || undefined;
  const apiSecret = pinataCfg.apiSecret || process.env.PINATA_API_SECRET || process.env.PINATA_SECRET || undefined;

  if (!jwt && !(apiKey && apiSecret)) {
    throw new Error("Pinata credentials missing. Set integrations.pinata.* in config or PINATA_JWT / PINATA_API_KEY + PINATA_SECRET env vars.");
  }

  return new PinataBridge({
    jwt,
    apiKey,
    apiSecret,
    maxPins: 100,
    ttlDays: 7,
    cleanupEnabled: true,
  });
}

async function cleanupNetworkEntries(ttlDays = 7): Promise<number> {
  const entries = await readNetworkEntries({ sort: "desc", unique: true });
  if (entries.length === 0) return 0;
  const cutoff = Date.now() - ttlDays * 24 * 60 * 60 * 1000;
  const keep: NetworkEntry[] = [];
  const removed: NetworkEntry[] = [];

  for (const entry of entries) {
    const time = new Date(entry.timestamp).getTime();
    const expired = !isNaN(time) && time < cutoff;
    const removable = entry.status === "imported" || entry.status === "unavailable";
    if (expired && removable) {
      removed.push(entry);
    } else {
      keep.push(entry);
    }
  }

  if (removed.length > 0) {
    keep.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    await writeNetworkEntries(keep);
  }

  return removed.length;
}

async function writeNetworkEntries(entries: NetworkEntry[]): Promise<void> {
  await fs.mkdir(path.dirname(NETWORK_CHAIN_FILE), { recursive: true });
  const content = entries.map((entry) => JSON.stringify(entry)).join("\n");
  await fs.writeFile(NETWORK_CHAIN_FILE, content ? content + "\n" : "", "utf-8");
}
