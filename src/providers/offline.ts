// Offline Mode Provider - Auto-detects online/offline status and provides fallback chain
// Part of the Offline Mode project

import type { Provider } from "./index.js";
import { loadOfflineConfig, saveOfflineConfig, DEFAULT_OFFLINE_CONFIG, type OfflineConfig } from "../offline/config.js";

export type NetworkStatus = "online" | "offline" | "checking";

export interface FallbackChainResult {
  provider: Provider | null;
  model: string;
  status: "success" | "fallback" | "failed";
  error?: string;
}

const FALLBACK_CHAIN = [...DEFAULT_OFFLINE_CONFIG.fallbackModels];

export class OfflineDetector {
  private cache: Map<string, { status: NetworkStatus; timestamp: number }> = new Map();
  private cacheTimeout = 60000; // 1 minute cache

  /**
   * Detect if we're online or offline
   * Uses a simple connectivity check
   */
  async detect(): Promise<NetworkStatus> {
    const cached = this.cache.get("network");
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.status;
    }

    const status = await this.checkConnectivity();

    this.cache.set("network", {
      status,
      timestamp: Date.now(),
    });

    return status;
  }

  private async checkConnectivity(): Promise<NetworkStatus> {
    const endpoints = [
      "https://api.github.com",
      "https://api.openai.com",
      "https://api.minimax.chat",
    ];

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        await fetch(endpoint, {
          method: "HEAD",
          signal: controller.signal,
        });

        clearTimeout(timeout);
        return "online";
      } catch {
        continue;
      }
    }

    return "offline";
  }

  async checkProvider(provider: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      await fetch(`${provider}/tags`, {
        signal: controller.signal,
      });

      clearTimeout(timeout);
      return true;
    } catch {
      return false;
    }
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export class FallbackChain {
  private providers: Map<string, Provider> = new Map();
  private config: OfflineConfig;

  constructor(config: Partial<OfflineConfig> = {}) {
    const persisted = loadOfflineConfig();
    this.config = { ...persisted, ...config };
  }

  registerProvider(name: string, provider: Provider): void {
    this.providers.set(name, provider);
  }

  async tryProviders(
    messages: import("./index.js").LLMMessage[],
    options?: { model?: string; temperature?: number; max_tokens?: number }
  ): Promise<FallbackChainResult> {
    const detector = new OfflineDetector();
    const isOnline = await detector.detect();

    if (isOnline) {
      const cloudProviders = ["openai", "openrouter", "minimax"];

      for (const name of cloudProviders) {
        const provider = this.providers.get(name);
        if (provider && provider.isConfigured()) {
          try {
            const result = await provider.chat(messages, options);
            return {
              provider,
              model: options?.model || provider.models[0],
              status: "success",
            };
          } catch (error) {
            console.log(`⚠️  ${name} failed, trying next...`);
            continue;
          }
        }
      }
    }

    const localProviders = ["ollama"];
    for (const name of localProviders) {
      const provider = this.providers.get(name);
      if (provider && provider.isConfigured()) {
        const models = options?.model
          ? [options.model, ...this.config.fallbackModels]
          : [this.config.preferredModel, ...this.config.fallbackModels];

        for (const model of models) {
          try {
            const result = await provider.chat(messages, {
              ...options,
              model,
            });
            return {
              provider,
              model,
              status: isOnline ? "fallback" : "success",
            };
          } catch (error) {
            console.log(`⚠️  Model ${model} failed, trying next...`);
            continue;
          }
        }
      }
    }

    return {
      provider: null,
      model: this.config.preferredModel,
      status: "failed",
      error: "No available providers",
    };
  }

  getConfig(): OfflineConfig {
    return this.config;
  }

  updateConfig(config: Partial<OfflineConfig>): void {
    this.config = saveOfflineConfig(config);
  }
}

export class ContextCache {
  private cache: string[] = [];
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  add(content: string): void {
    this.cache.push(content);
    if (this.cache.length > this.maxSize) {
      this.cache.shift();
    }
  }

  addMany(contents: string[]): void {
    for (const content of contents) {
      this.add(content);
    }
  }

  getRecent(count: number): string[] {
    return this.cache.slice(-count);
  }

  getAll(): string[] {
    return [...this.cache];
  }

  clear(): void {
    this.cache = [];
  }

  size(): number {
    return this.cache.length;
  }

  isEmpty(): boolean {
    return this.cache.length === 0;
  }
}

export function getRecommendedOfflineModel(): string {
  const config = loadOfflineConfig();
  return config.preferredModel || FALLBACK_CHAIN[0];
}

export function getOfflineModels(): string[] {
  const config = loadOfflineConfig();
  return config.fallbackModels.length ? [...config.fallbackModels] : [...FALLBACK_CHAIN];
}

export type { OfflineConfig };
