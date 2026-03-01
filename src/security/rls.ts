import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { parse } from "yaml";
import { z } from "zod";
import { MEMPHIS_HOME } from "../config/defaults.js";

const RLS_DIR = join(MEMPHIS_HOME, "rls");
const POLICY_PATH = join(RLS_DIR, "policies.yaml");
const CACHE_PATH = join(RLS_DIR, "cache.json");
const STATE_PATH = join(RLS_DIR, "state.json");

const ChainTagsSchema = z.object({
  include: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
}).optional();

const ChainRuleSchema = z.object({
  read: z.boolean().optional(),
  write: z.boolean().optional(),
  export: z.boolean().optional(),
  import: z.boolean().optional(),
  tags: ChainTagsSchema,
}).passthrough();

const OperationRuleSchema = z
  .object({
    enabled: z.boolean().optional(),
  })
  .catchall(z.any());

const WorkspaceSchema = z.object({
  id: z.string().min(1),
  description: z.string().optional(),
  default: z.boolean().optional(),
  allow: z
    .object({
      chains: z.record(z.string(), ChainRuleSchema).optional(),
      operations: z.record(z.string(), OperationRuleSchema).optional(),
    })
    .optional(),
});

const PolicySchema = z.object({
  version: z.number().int().positive().default(1),
  workspaces: z.array(WorkspaceSchema).min(1),
});

export type ChainRule = z.infer<typeof ChainRuleSchema>;
export type OperationRule = z.infer<typeof OperationRuleSchema>;
export interface CompiledWorkspacePolicy {
  id: string;
  description?: string;
  default?: boolean;
  chains: Record<string, ChainRule>;
  operations: Record<string, OperationRule>;
}

export interface CompiledRlsPolicy {
  version: number;
  workspaces: Record<string, CompiledWorkspacePolicy>;
  defaultWorkspaceId?: string;
}

export interface AccessContext {
  workspaceId?: string;
  tags?: string[];
  type?: string;
  agent?: string;
}

export class RlsViolationError extends Error {
  constructor(message: string, public readonly reason?: string) {
    super(message);
    this.name = "RlsViolationError";
  }
}

interface CacheFile {
  hash: string;
  policy: CompiledRlsPolicy;
  updatedAt: string;
}

interface StateFile {
  currentWorkspaceId?: string;
}

let inMemoryPolicy: CompiledRlsPolicy | null = null;
let lastHash: string | null = null;

function ensureDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true, mode: 0o700 });
}

function readPolicyFile(): { contents: string; hash: string } | null {
  if (!existsSync(POLICY_PATH)) {
    return null;
  }
  const contents = readFileSync(POLICY_PATH, "utf-8");
  const hash = createHash("sha256").update(contents).digest("hex");
  return { contents, hash };
}

function loadFromCache(hash: string): CompiledRlsPolicy | null {
  if (!existsSync(CACHE_PATH)) {
    return null;
  }
  try {
    const raw = readFileSync(CACHE_PATH, "utf-8");
    const data = JSON.parse(raw) as CacheFile;
    if (data.hash === hash && data.policy) {
      return data.policy;
    }
  } catch {
    return null;
  }
  return null;
}

function writeCache(hash: string, policy: CompiledRlsPolicy): void {
  ensureDir(CACHE_PATH);
  const payload: CacheFile = {
    hash,
    policy,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(CACHE_PATH, JSON.stringify(payload, null, 2), "utf-8");
}

function compilePolicy(policy: z.infer<typeof PolicySchema>): CompiledRlsPolicy {
  const workspaces: Record<string, CompiledWorkspacePolicy> = {};
  let defaultWorkspaceId: string | undefined;

  for (const ws of policy.workspaces) {
    workspaces[ws.id] = {
      id: ws.id,
      description: ws.description,
      default: ws.default,
      chains: ws.allow?.chains ?? {},
      operations: ws.allow?.operations ?? {},
    };
    if (ws.default) {
      defaultWorkspaceId = ws.id;
    }
  }

  if (!defaultWorkspaceId) {
    defaultWorkspaceId = policy.workspaces[0]?.id;
  }

  return {
    version: policy.version,
    workspaces,
    defaultWorkspaceId,
  };
}

export function loadRlsPolicy(force = false): CompiledRlsPolicy | null {
  if (!force && inMemoryPolicy) {
    return inMemoryPolicy;
  }

  const file = readPolicyFile();
  if (!file) {
    inMemoryPolicy = null;
    lastHash = null;
    return null;
  }

  if (!force && lastHash && lastHash === file.hash && inMemoryPolicy) {
    return inMemoryPolicy;
  }

  const cached = loadFromCache(file.hash);
  if (cached && !force) {
    inMemoryPolicy = cached;
    lastHash = file.hash;
    return cached;
  }

  const parsed = parse(file.contents) || {};
  const result = PolicySchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(
      `Invalid RLS policy: ${result.error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join(", " )}`
    );
  }

  const compiled = compilePolicy(result.data);
  writeCache(file.hash, compiled);
  inMemoryPolicy = compiled;
  lastHash = file.hash;
  return compiled;
}

function readState(): StateFile {
  if (!existsSync(STATE_PATH)) return {};
  try {
    const raw = readFileSync(STATE_PATH, "utf-8");
    return JSON.parse(raw) as StateFile;
  } catch {
    return {};
  }
}

function writeState(state: StateFile): void {
  ensureDir(STATE_PATH);
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
}

export function getCurrentWorkspaceId(): string | undefined {
  if (process.env.MEMPHIS_WORKSPACE) {
    return process.env.MEMPHIS_WORKSPACE;
  }
  const state = readState();
  if (state.currentWorkspaceId) {
    return state.currentWorkspaceId;
  }
  const policy = loadRlsPolicy();
  return policy?.defaultWorkspaceId;
}

export function setCurrentWorkspaceId(id: string): void {
  const policy = loadRlsPolicy();
  if (policy && !policy.workspaces[id]) {
    throw new Error(`Workspace ${id} not defined in RLS policy`);
  }
  writeState({ currentWorkspaceId: id });
}

function resolveWorkspace(workspaceId?: string): CompiledWorkspacePolicy | null {
  const policy = loadRlsPolicy();
  if (!policy) return null;
  const id = workspaceId || getCurrentWorkspaceId() || policy.defaultWorkspaceId;
  if (!id) return null;
  return policy.workspaces[id] ?? null;
}

function bypassed(): boolean {
  return process.env.MEMPHIS_RLS_BYPASS === "1";
}

function chainActionAllowed(rule: ChainRule | undefined, action: "read" | "write" | "export" | "import"): boolean {
  if (!rule) return true;
  if (rule[action] === false) return false;
  return true;
}

function tagsAllowed(rule: ChainRule | undefined, tags: string[] | undefined): boolean {
  if (!rule?.tags) return true;
  const { include, exclude } = rule.tags;
  if (exclude && tags) {
    const hit = tags.some(tag => exclude.includes(tag));
    if (hit) return false;
  }
  if (include && include.length > 0) {
    if (!tags || tags.length === 0) return false;
    const includesRequired = include.every(tag => tags.includes(tag));
    return includesRequired;
  }
  return true;
}

export function assertChainAccess(
  chain: string,
  action: "read" | "write" | "export" | "import",
  context: AccessContext = {}
): void {
  if (bypassed()) return;
  const workspace = resolveWorkspace(context.workspaceId);
  if (!workspace) return;
  const rule = workspace.chains[chain];
  if (!chainActionAllowed(rule, action)) {
    throw new RlsViolationError(
      `Workspace ${workspace.id} is not allowed to ${action} chain ${chain}`,
      `${workspace.id}:${chain}:${action}`
    );
  }
  if (!tagsAllowed(rule, context.tags)) {
    throw new RlsViolationError(`Chain ${chain} tag policy violation`, `${workspace.id}:${chain}:tags`);
  }
}

export function assertOperation(operationId: string, context: AccessContext = {}): void {
  if (bypassed()) return;
  const workspace = resolveWorkspace(context.workspaceId);
  if (!workspace) return;
  const rule = workspace.operations[operationId];
  if (rule && rule.enabled === false) {
    throw new RlsViolationError(
      `Operation ${operationId} disabled for workspace ${workspace.id}`,
      `${workspace.id}:operation:${operationId}`
    );
  }
}

export function getRlsStatus(): {
  policyLoaded: boolean;
  workspaceId?: string;
  defaultWorkspaceId?: string;
  policyHash?: string;
} {
  const file = readPolicyFile();
  const policy = loadRlsPolicy();
  return {
    policyLoaded: Boolean(policy),
    workspaceId: getCurrentWorkspaceId(),
    defaultWorkspaceId: policy?.defaultWorkspaceId,
    policyHash: file?.hash,
  };
}
