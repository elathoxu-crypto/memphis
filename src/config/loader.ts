import { readFileSync, existsSync } from "node:fs";
import { parse } from "yaml";
import { z } from "zod";
import { homedir } from "node:os";
import { DEFAULT_CONFIG, CONFIG_PATH } from "./defaults.js";

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

const MemphisConfigSchema = z.object({
  providers: z.record(z.string(), ProviderSchema).optional(),
  memory: MemoryConfigSchema.optional(),
  agents: z.record(z.string(), AgentConfigSchema).optional(),
  integrations: IntegrationsConfigSchema,
});

export type MemphisConfig = z.infer<typeof MemphisConfigSchema> & typeof DEFAULT_CONFIG;

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
  const merged = deepMerge(DEFAULT_CONFIG, fileConfig) as MemphisConfig;
  
  // Resolve ~ in memory.path
  if (merged.memory?.path) {
    merged.memory.path = resolvePath(merged.memory.path);
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

  return merged;
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
