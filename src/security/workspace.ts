import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { MEMPHIS_HOME } from "../config/defaults.js";
import { DEFAULT_ALLOWED_CHAINS, WORKSPACE_TAG_PREFIX } from "./constants.js";

export interface WorkspacePolicy {
  allowedChains: string[];
  includeDefault: boolean;
  tags: string[];
}

export interface WorkspaceDefinition {
  id: string;
  label?: string;
  allowedChains?: string[];
  includeDefault?: boolean;
  tags?: string[];
  policy: WorkspacePolicy;
}

export interface SecurityConfig {
  defaultWorkspace: string;
  workspaces: WorkspaceDefinition[];
  workspaceMap: Record<string, WorkspaceDefinition>;
}

export interface WorkspaceSelection {
  id: string;
  updatedAt: string;
}

const WORKSPACE_SELECTION_FILE = join(MEMPHIS_HOME, "workspace-selection.json");

function ensureDir(filePath: string): void {
  mkdirSync(dirname(filePath), { recursive: true, mode: 0o700 });
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

export function getWorkspaceSelectionFilePath(): string {
  return WORKSPACE_SELECTION_FILE;
}

export function readWorkspaceSelection(): WorkspaceSelection | null {
  if (!existsSync(WORKSPACE_SELECTION_FILE)) {
    return null;
  }
  try {
    const raw = readFileSync(WORKSPACE_SELECTION_FILE, "utf-8");
    const parsed = JSON.parse(raw) as WorkspaceSelection;
    if (parsed?.id) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function writeWorkspaceSelection(id: string): void {
  ensureDir(WORKSPACE_SELECTION_FILE);
  const payload: WorkspaceSelection = {
    id,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(WORKSPACE_SELECTION_FILE, JSON.stringify(payload, null, 2), { mode: 0o600 });
}

export function normalizeWorkspaceDefinition(def: Omit<WorkspaceDefinition, "policy">): WorkspaceDefinition {
  const allowedChains = dedupe(def.allowedChains ?? []);
  const includeDefault = def.includeDefault !== false;
  const normalizedTags = dedupe(def.tags ?? []);

  if (!normalizedTags.some(tag => tag.startsWith(WORKSPACE_TAG_PREFIX))) {
    normalizedTags.push(`${WORKSPACE_TAG_PREFIX}${def.id}`);
  }

  return {
    ...def,
    allowedChains,
    includeDefault,
    tags: normalizedTags,
    policy: {
      allowedChains,
      includeDefault,
      tags: normalizedTags,
    },
  };
}

export function resolveAllowedChains(policy: WorkspacePolicy): Set<string> {
  const allowed = new Set<string>();
  if (policy.includeDefault) {
    DEFAULT_ALLOWED_CHAINS.forEach(chain => allowed.add(chain));
  }
  policy.allowedChains.forEach(chain => allowed.add(chain));
  return allowed;
}
