import chalk from "chalk";
import path from "node:path";
import { loadConfig } from "../../config/loader.js";
import { Store } from "../../memory/store.js";
import { readNetworkEntries, NetworkEntry } from "../share-sync.js";
import {
  appendManifestRecord,
  deriveManifestStatus,
  formatManifestRange,
  manifestExpiresAt,
  manifestKey,
  readManifestLog,
  ShareManifestPayload,
  ShareManifestRecord,
  ShareManifestSource,
  ShareManifestStatus,
} from "../../share/manifest.js";

export interface ShareReplicatorOptions {
  plan?: boolean;
  push?: boolean;
  pull?: boolean;
  file?: string;
  limit?: number;
  dryRun?: boolean;
}

const TTL_DEFAULT_DAYS = 7;

export async function shareReplicatorCommand(opts: ShareReplicatorOptions = {}): Promise<void> {
  const shouldPlan = Boolean(opts.plan);
  const shouldPush = Boolean(opts.push);
  const shouldPull = Boolean(opts.pull);
  const limit = opts.limit ?? 25;
  const dryRun = Boolean(opts.dryRun);

  if (!shouldPlan && !shouldPush && !shouldPull) {
    console.log(chalk.gray("[share-replicator] nothing to do (use --plan/--push/--pull)"));
    return;
  }

  const config = loadConfig();
  const store = new Store(config.memory.path);

  if (shouldPlan) {
    await handlePlan();
  }

  if (shouldPush) {
    await handlePush(store, limit, dryRun);
  }

  if (shouldPull) {
    if (!opts.file) {
      console.log(chalk.yellow("[share-replicator] --pull requires --file pointing to remote manifest JSONL"));
    } else {
      await handlePull(store, opts.file, limit, dryRun);
    }
  }
}

async function handlePlan(): Promise<void> {
  const records = await readManifestLog();
  if (records.length === 0) {
    console.log(chalk.gray("[share-replicator] no manifest entries yet"));
    return;
  }

  const now = new Date();
  const rows = records
    .slice()
    .sort((a, b) => new Date(b.manifest.created_at).getTime() - new Date(a.manifest.created_at).getTime())
    .map((record) => {
      const status = deriveManifestStatus(record, now);
      const expiresAt = manifestExpiresAt(record.manifest);
      return {
        CID: record.manifest.cid,
        Range: `${record.manifest.chain}${formatManifestRange(record.manifest)}`,
        Publisher: record.manifest.publisher,
        Source: record.source || "local",
        Status: status,
        Expires: expiresAt.toISOString(),
        TTLd: record.manifest.ttl_days,
      };
    });

  console.table(rows);
}

async function handlePush(store: Store, limit: number, dryRun: boolean): Promise<void> {
  const existing = await readManifestLog();
  const seen = new Set(existing.map((record) => manifestKey(record.manifest)));
  const entries = await readNetworkEntries({ sort: "desc", unique: true });
  const publisherFallback = getPublisherId();
  const payloads: ShareManifestPayload[] = [];

  for (const entry of entries) {
    if (!entry.cid) continue;
    if (entry.status && entry.status !== "pinned") continue;
    const payload: ShareManifestPayload = {
      cid: entry.cid,
      chain: entry.chain,
      from: entry.index,
      to: entry.index,
      ttl_days: TTL_DEFAULT_DAYS,
      created_at: entry.timestamp || new Date().toISOString(),
      publisher: entry.agent || publisherFallback,
    };
    const key = manifestKey(payload);
    if (seen.has(key)) continue;
    seen.add(key);
    payloads.push(payload);
    if (payloads.length >= limit) break;
  }

  if (payloads.length === 0) {
    console.log(chalk.gray("[share-replicator] no new network entries to publish"));
    return;
  }

  console.log(chalk.blue(`[share-replicator] preparing ${payloads.length} manifest entries`));

  for (const payload of payloads) {
    const label = `${payload.chain}${formatManifestRange(payload)}`;
    if (dryRun) {
      console.log(chalk.yellow(`[share-replicator] DRY RUN: would record manifest for ${label} (${payload.cid})`));
      continue;
    }
    await persistManifest(store, payload, "local", "pending");
    console.log(chalk.green(`[share-replicator] recorded manifest ${label} (${payload.cid})`));
  }
}

async function handlePull(store: Store, filePath: string, limit: number, dryRun: boolean): Promise<void> {
  const resolved = path.resolve(filePath);
  const remoteRecords = await readManifestLog(resolved);
  if (remoteRecords.length === 0) {
    console.log(chalk.gray(`[share-replicator] no entries found in ${resolved}`));
    return;
  }

  const localRecords = await readManifestLog();
  const seen = new Set(localRecords.map((record) => manifestKey(record.manifest)));
  const candidates = remoteRecords.filter((record) => !seen.has(manifestKey(record.manifest)));

  if (candidates.length === 0) {
    console.log(chalk.gray("[share-replicator] no new remote manifest entries"));
    return;
  }

  const queued = candidates.slice(0, limit);
  console.log(chalk.blue(`[share-replicator] importing ${queued.length} manifest entries from ${resolved}`));

  for (const record of queued) {
    const status: ShareManifestStatus = record.status ?? "queued";
    const source: ShareManifestSource = "remote";
    const label = `${record.manifest.chain}${formatManifestRange(record.manifest)}`;
    if (dryRun) {
      console.log(chalk.yellow(`[share-replicator] DRY RUN: would queue remote manifest ${label} (${record.manifest.cid})`));
      continue;
    }
    await persistManifest(store, record.manifest, source, status, record.notes);
    console.log(chalk.green(`[share-replicator] queued remote manifest ${label} (${record.manifest.cid})`));
  }
}

async function persistManifest(
  store: Store,
  payload: ShareManifestPayload,
  source: ShareManifestSource,
  status: ShareManifestStatus,
  notes?: string
): Promise<void> {
  const tags = ["share", "manifest"];
  if (source === "remote") {
    tags.push("remote");
  }

  const rangeLabel = formatManifestRange(payload);
  const dataNotes: Record<string, unknown> = {
    manifest_status: status,
    manifest_source: source,
  };
  if (notes) {
    dataNotes.notes = notes;
  }

  const block = await store.appendBlock("share-manifest", {
    type: "share_manifest",
    content: `share ${payload.chain}${rangeLabel} → ${payload.publisher}`,
    tags,
    agent: payload.publisher,
    data: dataNotes,
    manifest: payload,
  });

  const record: ShareManifestRecord = {
    id: manifestKey(payload),
    manifest: payload,
    status,
    source,
    block_index: block.index,
    recorded_at: block.timestamp,
    notes,
  };

  await appendManifestRecord(record);
}

function getPublisherId(): string {
  return process.env.MEMPHIS_AGENT || process.env.USER || process.env.LOGNAME || "unknown";
}
