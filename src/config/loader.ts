import { readFileSync, existsSync } from "node:fs";
import { parse } from "yaml";
import { z } from "zod";
import { homedir } from "node:os";
import { DEFAULT_CONFIG, CONFIG_PATH } from "./defaults.js";
import { normalizeWorkspaceDefinition } from "../security/workspace.js";
import type { SecurityConfig, WorkspaceDefinition } from "../security/workspace.js";

// Helper to resolve ~ in paths
function resolvePath(path: string): string {
  if (path.startsWith("~/") || path === "~") {
    return path.replace("~", homedir());
  }
  return path;
}

// Config schema validation
const ProviderSchema = z.object({
  url: z.string().url().optional(),
  model: z.string().optional(),
  api_key: z.string().optional(),
  role: z.enum(["primary", "fallback", "offline"]).optional(),
});

const MemoryConfigSchema = z.object({
  path: z.string().optional(),
  auto_git: z.boolean().optional(),
  auto_git_push: z.boolean().optional(),
});

const AgentConfigSchema = z.object({
  chain: z.string().optional(),
  context_window: z.number().int().positive().optional(),
});

const PinataIntegrationSchema = z.object({
  jwt: z.string().optional(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
});

const IntegrationsConfigSchema = z.object({
  pinata: PinataIntegrationSchema.optional(),
}).catchall(z.any()).optional();

const TelegramConfigSchema = z.object({
  bot_token: z.string().optional(),
}).optional();

const EmbeddingsConfigSchema = z.object({
  enabled: z.boolean().optional(),
  backend: z.enum(["ollama", "openai", "mock"]).optional(),
  model: z.string().optional(),
  storage_path: z.string().optional(),
  ollama_url: z.string().optional(),
  top_k: z.number().int().positive().optional(),
  semantic_weight: z.number().min(0).max(1).optional(),
});

const CollectorConfigSchema = z.object({
  enabled: z.boolean().optional(),
  interval: z.number().int().positive().optional(),
}).passthrough();

const DaemonConfigSchema = z.object({
  interval: z.number().int().positive().optional(),
  collectors: z.record(z.string(), CollectorConfigSchema).optional(),
}).optional();

const WorkspaceDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().optional(),
  allowedChains: z.array(z.string()).optional(),
  includeDefault: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const SecurityConfigSchema = z.object({
  defaultWorkspace: z.string().optional(),
  workspaces: z.array(WorkspaceDefinitionSchema).nonempty({ message: "At least one workspace must be defined" }),
});

const MemphisConfigSchema = z.object({
  providers: z.record(z.string(), ProviderSchema).optional(),
  memory: MemoryConfigSchema.optional(),
  embeddings: EmbeddingsConfigSchema.optional(),
  agents: z.record(z.string(), AgentConfigSchema).optional(),
  integrations: IntegrationsConfigSchema,
  telegram: TelegramConfigSchema,
  daemon: DaemonConfigSchema,
  security: SecurityConfigSchema,
});

type MemphisConfigRaw = z.infer<typeof MemphisConfigSchema>;
export type MemphisConfig = Omit<MemphisConfigRaw, "security"> & {
  security: SecurityConfig;
} & typeof DEFAULT_CONFIG;

export class ConfigError extends Error {
  constructor(message: string, public readonly issues?: z.ZodIssue[]) {
    super(message);
    this.name = "ConfigError";
  }
}

export function loadConfig(): MemphisConfig {
  let fileConfig = {};

  // Global config
  if (existsSync(CONFIG_PATH)) {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    fileConfig = parse(raw) || {};
  }

  // Project-local config (override)
  const localPath = ".memphis/config.yaml";
  if (existsSync(localPath)) {
    const raw = readFileSync(localPath, "utf-8");
    const local = parse(raw) || {};
    fileConfig = deepMerge(fileConfig, local);
  }

  // Resolve env vars in api_key
  const merged = deepMerge(DEFAULT_CONFIG, fileConfig);
  
  // Resolve ~ in memory.path
  if (merged.memory?.path) {
    merged.memory.path = resolvePath(merged.memory.path);
  }

  if (merged.embeddings?.storage_path) {
    merged.embeddings.storage_path = resolvePath(merged.embeddings.storage_path);
  }
  
  if (merged.providers) {
    for (const key of Object.keys(merged.providers)) {
      const provider = merged.providers[key];
      if (provider?.api_key?.startsWith("${") && provider.api_key.endsWith("}")) {
        const envVar = provider.api_key.slice(2, -1);
        provider.api_key = process.env[envVar] || "";
      }
    }
  }

  // Validate config
  const result = MemphisConfigSchema.safeParse(merged);
  if (!result.success) {
    throw new ConfigError(
      `Invalid config: ${result.error.issues.map((e: z.ZodIssue) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
      result.error.issues
    );
  }

  const security = buildSecurityConfig(result.data.security);

  return {
    ...result.data,
    security,
  } as MemphisConfig;
}

export function buildSecurityConfig(raw: z.infer<typeof SecurityConfigSchema>): SecurityConfig {
  const normalized: WorkspaceDefinition[] = raw.workspaces.map(normalizeWorkspaceDefinition);
  const workspaceMap: Record<string, WorkspaceDefinition> = {};

  for (const ws of normalized) {
    if (workspaceMap[ws.id]) {
      throw new ConfigError(`Duplicate workspace id: ${ws.id}`);
    }
    workspaceMap[ws.id] = ws;
  }

  const defaultWorkspace = (raw.defaultWorkspace || normalized[0]?.id)?.trim();

  if (!defaultWorkspace) {
    throw new ConfigError("Default workspace cannot be empty");
  }

  if (!workspaceMap[defaultWorkspace]) {
    throw new ConfigError(`Default workspace "${defaultWorkspace}" is not defined`);
  }

  return {
    defaultWorkspace,
    workspaces: normalized,
    workspaceMap,
  };
}

function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}
