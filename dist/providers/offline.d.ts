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
export declare class OfflineDetector {
    private cache;
    private cacheTimeout;
    /**
     * Detect if we're online or offline
     * Uses a simple connectivity check
     */
    detect(): Promise<NetworkStatus>;
    private checkConnectivity;
    /**
     * Check if a specific provider is available
     */
    checkProvider(provider: string): Promise<boolean>;
    /**
     * Clear the detection cache
     */
    clearCache(): void;
}
/**
 * Fallback chain manager - tries providers in order until one works
 */
export declare class FallbackChain {
    private providers;
    private config;
    constructor(config?: Partial<OfflineConfig>);
    /**
     * Register a provider
     */
    registerProvider(name: string, provider: Provider): void;
    /**
     * Try providers in fallback order until one succeeds
     */
    tryProviders(messages: import("./index.js").LLMMessage[], options?: {
        model?: string;
        temperature?: number;
        max_tokens?: number;
    }): Promise<FallbackChainResult>;
    /**
     * Get the current offline config
     */
    getConfig(): OfflineConfig;
    /**
     * Update offline config
     */
    updateConfig(config: Partial<OfflineConfig>): void;
}
/**
 * Context cache for offline mode - caches recent blocks for fast access
 */
export declare class ContextCache {
    private cache;
    private maxSize;
    constructor(maxSize?: number);
    /**
     * Add content to cache
     */
    add(content: string): void;
    /**
     * Add multiple items
     */
    addMany(contents: string[]): void;
    /**
     * Get recent context
     */
    getRecent(count: number): string[];
    /**
     * Get all cached context
     */
    getAll(): string[];
    /**
     * Clear the cache
     */
    clear(): void;
    /**
     * Get cache size
     */
    size(): number;
    /**
     * Check if cache is empty
     */
    isEmpty(): boolean;
}
/**
 * Get recommended offline model based on system resources
 */
export declare function getRecommendedOfflineModel(): string;
/**
 * Get all available offline models
 */
export declare function getOfflineModels(): string[];
