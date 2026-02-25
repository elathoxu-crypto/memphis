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
export declare function createProvider(name: SupportedProvider, options?: CreateProviderOptions): Promise<ProviderResult>;
/**
 * Create best available provider
 * Priority: OpenAI > OpenRouter > MiniMax > Ollama
 */
export declare function createBestProvider(options?: CreateProviderOptions): Promise<ProviderResult>;
/**
 * Check vault status
 */
export declare function checkVaultStatus(): {
    initialized: boolean;
    available: boolean;
};
