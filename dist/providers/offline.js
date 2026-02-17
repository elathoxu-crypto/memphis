// Offline Mode Provider - Auto-detects online/offline status and provides fallback chain
// Part of the Offline Mode project
const DEFAULT_OFFLINE_CONFIG = {
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
    cache = new Map();
    cacheTimeout = 60000; // 1 minute cache
    /**
     * Detect if we're online or offline
     * Uses a simple connectivity check
     */
    async detect() {
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
    async checkConnectivity() {
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
            }
            catch {
                // Try next endpoint
                continue;
            }
        }
        return "offline";
    }
    /**
     * Check if a specific provider is available
     */
    async checkProvider(provider) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            await fetch(`${provider}/tags`, {
                signal: controller.signal,
            });
            clearTimeout(timeout);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Clear the detection cache
     */
    clearCache() {
        this.cache.clear();
    }
}
/**
 * Fallback chain manager - tries providers in order until one works
 */
export class FallbackChain {
    providers = new Map();
    config;
    constructor(config = {}) {
        this.config = { ...DEFAULT_OFFLINE_CONFIG, ...config };
    }
    /**
     * Register a provider
     */
    registerProvider(name, provider) {
        this.providers.set(name, provider);
    }
    /**
     * Try providers in fallback order until one succeeds
     */
    async tryProviders(messages, options) {
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
                    }
                    catch (error) {
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
                    }
                    catch (error) {
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
    getConfig() {
        return this.config;
    }
    /**
     * Update offline config
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
}
/**
 * Context cache for offline mode - caches recent blocks for fast access
 */
export class ContextCache {
    cache = [];
    maxSize;
    constructor(maxSize = 50) {
        this.maxSize = maxSize;
    }
    /**
     * Add content to cache
     */
    add(content) {
        this.cache.push(content);
        if (this.cache.length > this.maxSize) {
            this.cache.shift();
        }
    }
    /**
     * Add multiple items
     */
    addMany(contents) {
        for (const content of contents) {
            this.add(content);
        }
    }
    /**
     * Get recent context
     */
    getRecent(count) {
        return this.cache.slice(-count);
    }
    /**
     * Get all cached context
     */
    getAll() {
        return [...this.cache];
    }
    /**
     * Clear the cache
     */
    clear() {
        this.cache = [];
    }
    /**
     * Get cache size
     */
    size() {
        return this.cache.length;
    }
    /**
     * Check if cache is empty
     */
    isEmpty() {
        return this.cache.length === 0;
    }
}
/**
 * Get recommended offline model based on system resources
 */
export function getRecommendedOfflineModel() {
    // Check available memory (simplified)
    // In production, you'd check actual system memory
    return FALLBACK_CHAIN[0]; // llama3.2:1b is the default recommendation
}
/**
 * Get all available offline models
 */
export function getOfflineModels() {
    return [...FALLBACK_CHAIN];
}
//# sourceMappingURL=offline.js.map