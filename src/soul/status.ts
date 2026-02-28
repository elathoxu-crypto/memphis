import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { MEMPHIS_HOME } from "../config/defaults.js";

export const DEFAULT_WORKSPACE_ROOT =
  process.env.MEMPHIS_WORKSPACE ||
  process.env.OPENCLAW_WORKSPACE ||
  process.cwd();

export interface SoulSignal {
  name: string;
  label: string;
  timestamp?: string;
  ageHours?: number;
  status: "ok" | "warn" | "missing";
  detail?: string;
  extra?: Record<string, unknown>;
}

export interface SoulTaskEntry {
  text: string;
  done: boolean;
}

export interface SoulAlert {
  id: string;
  severity: "warning" | "critical";
  message: string;
}

export interface SoulStatusReport {
  ok: boolean;
  workspaceRoot: string;
  identity: {
    agent: string;
    soulHash?: string;
    soulUpdated?: string;
  };
  files: Record<string, { path: string; mtime?: string; ageDays?: number } | undefined>;
  signals: Record<string, SoulSignal>;
  queue: SoulTaskEntry[];
  alerts: SoulAlert[];
  summary: string;
}

export interface CollectSoulStatusOptions {
  workspaceRoot?: string;
  now?: Date;
  touchHeartbeat?: boolean;
}

interface HeartbeatState {
  [key: string]: unknown;
}

const HOURS = 1000 * 60 * 60;
const DAYS = HOURS * 24;

function readText(file: string): string | undefined {
  try {
    if (!existsSync(file)) return undefined;
    return readFileSync(file, "utf-8");
  } catch {
    return undefined;
  }
}

function readJson(file: string): any {
  try {
    if (!existsSync(file)) return undefined;
    const raw = readFileSync(file, "utf-8");
    if (!raw.trim()) return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function writeJson(file: string, data: any): void {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function fileMeta(path: string): { path: string; mtime?: string; ageDays?: number } | undefined {
  try {
    if (!existsSync(path)) return undefined;
    const stats = statSync(path);
    const mtime = stats.mtime.toISOString();
    const ageDays = (Date.now() - stats.mtime.getTime()) / DAYS;
    return { path, mtime, ageDays };
  } catch {
    return { path };
  }
}

function parseQueue(path: string): SoulTaskEntry[] {
  const text = readText(path);
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const entries: SoulTaskEntry[] = [];
  for (const line of lines) {
    const match = line.match(/^\s*- \[( |x)\] (.+)$/i);
    if (match) {
      entries.push({ done: match[1].toLowerCase() === "x", text: match[2].trim() });
    }
  }
  return entries;
}

function buildTimeSignal(
  name: string,
  label: string,
  timestamp: string | undefined,
  staleHours: number,
  now: Date
): SoulSignal {
  if (!timestamp) {
    return { name, label, status: "missing", detail: "never" };
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return { name, label, status: "missing", detail: "invalid" };
  }
  const ageHours = (now.getTime() - date.getTime()) / HOURS;
  const status = ageHours > staleHours ? "warn" : "ok";
  return {
    name,
    label,
    timestamp: date.toISOString(),
    ageHours,
    status,
    detail: `${ageHours.toFixed(1)}h ago`,
  };
}

function hashFile(path: string): string | undefined {
  const text = readText(path);
  if (!text) return undefined;
  const hash = createHash("sha256").update(text).digest("hex");
  return hash.slice(0, 12);
}

function readShareManifestSnapshot(): { local: number; remote: number } {
  const file = join(MEMPHIS_HOME, "share-manifest", "index.jsonl");
  const text = readText(file);
  if (!text) return { local: 0, remote: 0 };
  let local = 0;
  let remote = 0;
  for (const line of text.split(/\n/)) {
    if (!line.trim()) continue;
    try {
      const record = JSON.parse(line);
      if (record.source === "remote") remote += 1;
      else local += 1;
    } catch {
      continue;
    }
  }
  return { local, remote };
}

function updateHeartbeatField(path: string, iso: string): void {
  const data = (readJson(path) as HeartbeatState | undefined) ?? {};
  data.soulStatus = iso;
  writeJson(path, data);
}

export function collectSoulStatus(options: CollectSoulStatusOptions = {}): SoulStatusReport {
  const workspaceRoot = options.workspaceRoot || DEFAULT_WORKSPACE_ROOT;
  const now = options.now ?? new Date();

  const heartbeatStatePath = join(workspaceRoot, "logs", "heartbeat-state.json");
  const queuePath = join(workspaceRoot, "tasks", "QUEUE.md");
  const soulPath = join(workspaceRoot, "SOUL.md");
  const heartbeatPath = join(workspaceRoot, "HEARTBEAT.md");
  const userPath = join(workspaceRoot, "USER.md");

  const heartbeatState = (readJson(heartbeatStatePath) as HeartbeatState | undefined) ?? {};

  const signals: Record<string, SoulSignal> = {};
  signals.shareSync = buildTimeSignal(
    "shareSync",
    "Share-sync",
    typeof heartbeatState.memphisShareSync === "string" ? (heartbeatState.memphisShareSync as string) : undefined,
    18,
    now
  );
  signals.autosummary = buildTimeSignal(
    "autosummary",
    "Autosummary",
    typeof heartbeatState.memphisAutosummary === "string" ? (heartbeatState.memphisAutosummary as string) : undefined,
    12,
    now
  );
  signals.semanticRecall = buildTimeSignal(
    "semanticRecall",
    "Semantic Recall",
    typeof heartbeatState.semanticRecall === "string" ? (heartbeatState.semanticRecall as string) : undefined,
    12,
    now
  );
  signals.soulStatus = buildTimeSignal(
    "soulStatus",
    "SOUL Check",
    typeof heartbeatState.soulStatus === "string" ? (heartbeatState.soulStatus as string) : undefined,
    6,
    now
  );

  const manifestSnapshot = readShareManifestSnapshot();
  signals.shareManifest = {
    name: "shareManifest",
    label: "Share manifest",
    status: "ok",
    detail: `local ${manifestSnapshot.local}, remote ${manifestSnapshot.remote}`,
    extra: manifestSnapshot,
  };

  const queueEntries = parseQueue(queuePath).slice(0, 5);

  const alerts: SoulAlert[] = [];
  if (signals.shareSync.status !== "ok") {
    alerts.push({ id: "share-sync", severity: "warning", message: "Share-sync stale" });
  }
  if (signals.autosummary.status !== "ok") {
    alerts.push({ id: "autosummary", severity: "warning", message: "Autosummary stale" });
  }
  if (signals.semanticRecall.status !== "ok") {
    alerts.push({ id: "semantic-recall", severity: "warning", message: "Semantic recall not refreshed" });
  }
  if (queueEntries.filter((entry) => !entry.done).length === 0) {
    alerts.push({ id: "task-queue", severity: "warning", message: "Task queue is empty" });
  }
  const heartbeatText = readText(heartbeatPath) ?? "";
  if (!heartbeatText.trim()) {
    alerts.push({ id: "heartbeat", severity: "warning", message: "HEARTBEAT.md is empty" });
  }

  const files = {
    soul: fileMeta(soulPath),
    heartbeat: fileMeta(heartbeatPath),
    user: fileMeta(userPath),
  };

  if (files.soul?.ageDays !== undefined && files.soul.ageDays > 7) {
    alerts.push({ id: "soul-aging", severity: "warning", message: "SOUL.md not updated in >7 days" });
  }

  const agent = process.env.MEMPHIS_AGENT || process.env.USER || process.env.LOGNAME || "unknown";
  const soulHash = hashFile(soulPath);

  const ok = alerts.length === 0;
  const summary = ok ? "SOUL steady" : `SOUL needs attention: ${alerts.map((a) => a.message).join(", ")}`;

  if (options.touchHeartbeat) {
    updateHeartbeatField(heartbeatStatePath, now.toISOString());
  }

  return {
    ok,
    workspaceRoot,
    identity: {
      agent,
      soulHash,
      soulUpdated: files.soul?.mtime,
    },
    files,
    signals,
    queue: queueEntries,
    alerts,
    summary,
  };
}
