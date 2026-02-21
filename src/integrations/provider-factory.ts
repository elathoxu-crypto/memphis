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
import type { Provider } from "../providers/index.js";

export type SupportedProvider = "openai" | "openrouter" | "minimax" | "ollama";

export interface CreateProviderOptions {
  /** Password for vault decryption */
  vaultPassword?: string;
  /** Override model */
  model?: string;
  /** Temperature setting */
  temperature?: number;
}

export interface ProviderResult {
  provider: Provider;
  source: "env" | "vault" | "config" | "fallback";
}

/**
 * Create a provider with automatic key resolution
 */
export async function createProvider(
  name: SupportedProvider,
  options: CreateProviderOptions = {}
): Promise<ProviderResult> {
  const { vaultPassword, model, temperature } = options;
  
  // Try to get API key from vault or env
  const apiKey = await getProviderApiKey(name as any, { vaultPassword });
  
  switch (name) {
    case "openai": {
      if (apiKey) {
        const p = new OpenAIProvider();
        // Inject the key (hacky but works)
        (p as any).apiKey = apiKey;
        return { provider: p, source: apiKey ? "vault" : "env" };
      }
      // Fallback to Ollama
      return { provider: new OllamaProvider(), source: "fallback" };
    }
    
    case "openrouter": {
      if (apiKey) {
        const p = new OpenRouterProvider();
        (p as any).apiKey = apiKey;
        return { provider: p, source: "vault" };
      }
      return { provider: new OllamaProvider(), source: "fallback" };
    }
    
    case "minimax": {
      if (apiKey) {
        const p = new MiniMaxProvider();
        (p as any).apiKey = apiKey;
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
export async function createBestProvider(
  options: CreateProviderOptions = {}
): Promise<ProviderResult> {
  // Try in order of preference
  const providers: SupportedProvider[] = ["openai", "openrouter", "minimax", "ollama"];
  
  for (const name of providers) {
    try {
      const result = await createProvider(name, options);
      if (result.provider.isConfigured()) {
        return result;
      }
    } catch {
      continue;
    }
  }
  
  // Ultimate fallback
  return { provider: new OllamaProvider(), source: "fallback" };
}

/**
 * Check vault status
 */
export function checkVaultStatus(): {
  initialized: boolean;
  available: boolean;
} {
  const initialized = isVaultInitialized();
  const hasPassword = !!process.env.VAULT_PASSWORD;
  
  return {
    initialized,
    available: initialized && hasPassword,
  };
}
