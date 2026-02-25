import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { MEMPHIS_HOME } from "../config/defaults.js";

export interface OfflineConfig {
  enabled: "auto" | "on" | "off";
  preferredModel: string;
  fallbackModels: string[];
  cacheContextBlocks: number;
  cacheEnabled: boolean;
  maxRamUsage: string;
  lastSwitch?: string | null;
}

const OFFLINE_CONFIG_PATH = join(MEMPHIS_HOME, "offline-config.json");

export const DEFAULT_OFFLINE_CONFIG: OfflineConfig = {
  enabled: "auto",
  preferredModel: "qwen2.5-coder:3b",
  fallbackModels: ["o3:mini", "llama3.2:1b", "gemma3:4b"],
  cacheContextBlocks: 50,
  cacheEnabled: true,
  maxRamUsage: "2GB",
  lastSwitch: null,
};

function ensureConfigDir(): void {
  const dir = dirname(OFFLINE_CONFIG_PATH);
  if (!existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true });
    } catch {
      // best effort
    }
  }
}

export function loadOfflineConfig(): OfflineConfig {
  ensureConfigDir();
  if (!existsSync(OFFLINE_CONFIG_PATH)) {
    return DEFAULT_OFFLINE_CONFIG;
  }

  try {
    const raw = readFileSync(OFFLINE_CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_OFFLINE_CONFIG,
      ...parsed,
      fallbackModels: parsed.fallbackModels || DEFAULT_OFFLINE_CONFIG.fallbackModels,
      lastSwitch: parsed.lastSwitch ?? DEFAULT_OFFLINE_CONFIG.lastSwitch,
    };
  } catch (error) {
    console.warn(`Warning: failed to read offline config: ${error}`);
    return DEFAULT_OFFLINE_CONFIG;
  }
}

export function saveOfflineConfig(update: Partial<OfflineConfig>): OfflineConfig {
  const current = loadOfflineConfig();
  const next: OfflineConfig = {
    ...current,
    ...update,
    fallbackModels: update.fallbackModels || current.fallbackModels,
    lastSwitch: update.lastSwitch ?? current.lastSwitch,
  };
  ensureConfigDir();
  writeFileSync(OFFLINE_CONFIG_PATH, JSON.stringify(next, null, 2), "utf-8");
  return next;
}
