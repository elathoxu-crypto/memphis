/**
 * Provider Factory - Creates providers with automatic vault integration
 *
 * Usage:
 *   import { createProvider } from "./provider-factory.js";
 *
 *   // With vault password from environment
 *   const provider = await createProvider("openai", {
 *     vaultPassword: process.env.VAULT_PASSWORD
 *   });
 */
import { OpenAIProvider } from "../providers/openai.js";
import { OpenRouterProvider } from "../providers/openrouter.js";
import { MiniMaxProvider } from "../providers/minimax.js";
import { OllamaProvider } from "../providers/ollama.js";
import { getProviderApiKey, isVaultInitialized } from "./vault-providers.js";
/**
 * Create a provider with automatic key resolution
 */
export async function createProvider(name, options = {}) {
    const { vaultPassword, model, temperature } = options;
    // Try to get API key from vault or env
    const apiKey = await getProviderApiKey(name, { vaultPassword });
    switch (name) {
        case "openai": {
            if (apiKey) {
                const p = new OpenAIProvider();
                // Inject the key (hacky but works)
                p.apiKey = apiKey;
                return { provider: p, source: apiKey ? "vault" : "env" };
            }
            // Fallback to Ollama
            return { provider: new OllamaProvider(), source: "fallback" };
        }
        case "openrouter": {
            if (apiKey) {
                const p = new OpenRouterProvider();
                p.apiKey = apiKey;
                return { provider: p, source: "vault" };
            }
            return { provider: new OllamaProvider(), source: "fallback" };
        }
        case "minimax": {
            if (apiKey) {
                const p = new MiniMaxProvider();
                p.apiKey = apiKey;
                return { provider: p, source: "vault" };
            }
            return { provider: new OllamaProvider(), source: "fallback" };
        }
        case "ollama": {
            return { provider: new OllamaProvider(), source: "fallback" };
        }
        default:
            throw new Error(`Unknown provider: ${name}`);
    }
}
/**
 * Create best available provider
 * Priority: OpenAI > OpenRouter > MiniMax > Ollama
 */
export async function createBestProvider(options = {}) {
    // Try in order of preference
    const providers = ["openai", "openrouter", "minimax", "ollama"];
    for (const name of providers) {
        try {
            const result = await createProvider(name, options);
            if (result.provider.isConfigured()) {
                return result;
            }
        }
        catch {
            continue;
        }
    }
    // Ultimate fallback
    return { provider: new OllamaProvider(), source: "fallback" };
}
/**
 * Check vault status
 */
export function checkVaultStatus() {
    const initialized = isVaultInitialized();
    const hasPassword = !!process.env.VAULT_PASSWORD;
    return {
        initialized,
        available: initialized && hasPassword,
    };
}
//# sourceMappingURL=provider-factory.js.map