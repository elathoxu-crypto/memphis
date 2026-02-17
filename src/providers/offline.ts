// Offline Mode Provider - Auto-detects online/offline status and provides fallback chain
// Part of the Offline Mode project

import type { Provider } from "./index.js";

export type NetworkStatus = "online" | "offline" | "checking";

export interface OfflineConfig {
  enabled: "auto" | "on" | "off";
  preferredModel: string;
  fallbackModels: string[];
  cacheContextBlocks: number;
  cacheEnabled: boolean;
  maxRamUsage: string;
}

export interface FallbackChainResult {
  provider: Provider | null;
  model: string;
  status: "success" | "fallback" | "failed";
  error?: string;
}

const DEFAULT_OFFLINE_CONFIG: OfflineConfig = {
  enabled: "auto",
  preferredModel: "llama3.2:1b",
  fallbackModels: ["llama3.2:3b", "gemma3:4b"],
  cacheContextBlocks: 50,
  cacheEnabled: true,
  maxRamUsage: "2GB",
};

const FALLBACK_CHAIN = [
  "llama3.2:1b",
  "llama3.2:3b",
  "gemma3:4b",
];

export class OfflineDetector {
  private cache: Map<string, { status: NetworkStatus; timestamp: number }> = new Map();
  private cacheTimeout = 60000; // 1 minute cache

  /**
   * Detect if we're online or offline
   * Uses a simple connectivity check
   */
  async detect(): Promise<NetworkStatus> {
    // Check cache first
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
    // Try to reach a reliable external endpoint
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
        // Try next endpoint
        continue;
      }
    }

    return "offline";
  }

  /**
   * Check if a specific provider is available
   */
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

  /**
   * Clear the detection cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Fallback chain manager - tries providers in order until one works
 */
export class FallbackChain {
  private providers: Map<string, Provider> = new Map();
  private config: OfflineConfig;

  constructor(config: Partial<OfflineConfig> = {}) {
    this.config = { ...DEFAULT_OFFLINE_CONFIG, ...config };
  }

  /**
   * Register a provider
   */
  registerProvider(name: string, provider: Provider): void {
    this.providers.set(name, provider);
  }

  /**
   * Try providers in fallback order until one succeeds
   */
  async tryProviders(
    messages: import("./index.js").LLMMessage[],
    options?: { model?: string; temperature?: number; max_tokens?: number }
  ): Promise<FallbackChainResult> {
    const detector = new OfflineDetector();
    const isOnline = await detector.detect();

    // If online, try cloud providers first
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

    // Try local providers (Ollama)
    const localProviders = ["ollama"];
    
    for (const name of localProviders) {
      const provider = this.providers.get(name);
      if (provider && provider.isConfigured()) {
        // Try preferred model first, then fallbacks
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

  /**
   * Get the current offline config
   */
  getConfig(): OfflineConfig {
    return this.config;
  }

  /**
   * Update offline config
   */
  updateConfig(config: Partial<OfflineConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Context cache for offline mode - caches recent blocks for fast access
 */
export class ContextCache {
  private cache: string[] = [];
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  /**
   * Add content to cache
   */
  add(content: string): void {
    this.cache.push(content);
    if (this.cache.length > this.maxSize) {
      this.cache.shift();
    }
  }

  /**
   * Add multiple items
   */
  addMany(contents: string[]): void {
    for (const content of contents) {
      this.add(content);
    }
  }

  /**
   * Get recent context
   */
  getRecent(count: number): string[] {
    return this.cache.slice(-count);
  }

  /**
   * Get all cached context
   */
  getAll(): string[] {
    return [...this.cache];
  }

  /**
   * Clear the cache
   */
  clear(): void {
    this.cache = [];
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.length;
  }

  /**
   * Check if cache is empty
   */
  isEmpty(): boolean {
    return this.cache.length === 0;
  }
}

/**
 * Get recommended offline model based on system resources
 */
export function getRecommendedOfflineModel(): string {
  // Check available memory (simplified)
  // In production, you'd check actual system memory
  return FALLBACK_CHAIN[0]; // llama3.2:1b is the default recommendation
}

/**
 * Get all available offline models
 */
export function getOfflineModels(): string[] {
  return [...FALLBACK_CHAIN];
}
