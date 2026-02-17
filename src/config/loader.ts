import { readFileSync, existsSync } from "node:fs";
import { parse } from "yaml";
import { DEFAULT_CONFIG, CONFIG_PATH } from "./defaults.js";

export type MemphisConfig = typeof DEFAULT_CONFIG & {
  providers: Record<string, {
    url: string;
    model: string;
    api_key: string;
    role?: "primary" | "fallback" | "offline";
  }>;
};

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
  for (const [, provider] of Object.entries(merged.providers || {})) {
    if (provider.api_key?.startsWith("${") && provider.api_key?.endsWith("}")) {
      const envVar = provider.api_key.slice(2, -1);
      provider.api_key = process.env[envVar] || "";
    }
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
