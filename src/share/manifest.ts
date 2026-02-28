import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { MEMPHIS_HOME } from "../config/defaults.js";

export const SHARE_MANIFEST_DIR = join(MEMPHIS_HOME, "share-manifest");
export const SHARE_MANIFEST_INDEX = join(SHARE_MANIFEST_DIR, "index.jsonl");

export interface ShareManifestPayload {
  cid: string;
  chain: string;
  from: number;
  to: number;
  ttl_days: number;
  created_at: string;
  publisher: string;
  signature?: string;
}

export type ShareManifestSource = "local" | "remote";
export type ShareManifestStatus = "pending" | "queued" | "imported" | "expired" | "stub";

export interface ShareManifestRecord {
  id: string;
  manifest: ShareManifestPayload;
  status?: ShareManifestStatus;
  source?: ShareManifestSource;
  block_index?: number;
  recorded_at?: string;
  notes?: string;
}

const TTL_FALLBACK_DAYS = 7;

export function manifestKey(payload: ShareManifestPayload): string {
  return `${payload.cid}:${payload.chain}:${payload.from}-${payload.to}`;
}

export function manifestExpiresAt(payload: ShareManifestPayload): Date {
  const created = new Date(payload.created_at);
  const ttl = (payload.ttl_days ?? TTL_FALLBACK_DAYS) * 24 * 60 * 60 * 1000;
  return new Date(created.getTime() + ttl);
}

export async function readManifestLog(filePath: string = SHARE_MANIFEST_INDEX): Promise<ShareManifestRecord[]> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          const parsed = JSON.parse(line);
          if (!parsed.manifest && parsed.cid) {
            parsed.manifest = {
              cid: parsed.cid,
              chain: parsed.chain,
              from: parsed.from ?? 0,
              to: parsed.to ?? parsed.from ?? 0,
              ttl_days: parsed.ttl_days ?? TTL_FALLBACK_DAYS,
              created_at: parsed.created_at ?? new Date().toISOString(),
              publisher: parsed.publisher ?? "unknown",
              signature: parsed.signature,
            } satisfies ShareManifestPayload;
          }
          if (!parsed.manifest) return null;
          const record: ShareManifestRecord = {
            id: parsed.id || manifestKey(parsed.manifest),
            manifest: parsed.manifest,
            status: parsed.status,
            source: parsed.source,
            block_index: parsed.block_index,
            recorded_at: parsed.recorded_at,
            notes: parsed.notes,
          };
          return record;
        } catch (err) {
          console.warn(`[share-manifest] Failed to parse manifest line: ${err}`);
          return null;
        }
      })
      .filter((record): record is ShareManifestRecord => Boolean(record));
  } catch (err: any) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

export async function appendManifestRecord(record: ShareManifestRecord, filePath: string = SHARE_MANIFEST_INDEX): Promise<void> {
  const line = JSON.stringify({
    ...record,
    id: record.id || manifestKey(record.manifest),
  });
  await fs.mkdir(dirname(filePath), { recursive: true, mode: 0o700 });
  await fs.appendFile(filePath, line + "\n", "utf-8");
}

export function deriveManifestStatus(record: ShareManifestRecord, now: Date = new Date()): ShareManifestStatus {
  const expiresAt = manifestExpiresAt(record.manifest);
  if (expiresAt.getTime() < now.getTime()) {
    return "expired";
  }
  return record.status || (record.source === "remote" ? "queued" : "pending");
}

export function formatManifestRange(manifest: ShareManifestPayload): string {
  const same = manifest.from === manifest.to;
  return same ? `#${manifest.from}` : `#${manifest.from}-${manifest.to}`;
}
