/**
 * Vault Integration with Providers
 *
 * This module shows how Memphis can automatically retrieve API keys from vault
 * instead of using environment variables.
 */
export declare const VAULT_KEYS: {
    readonly openai: "openai-api-key";
    readonly openrouter: "openrouter-api-key";
    readonly minimax: "minimax-api-key";
};
export type ProviderName = keyof typeof VAULT_KEYS;
/**
 * Get secret from vault by key name
 * Requires password to decrypt
 */
export declare function getVaultSecret(keyName: string, password: string, chainsPath?: string): string | null;
/**
 * Check if vault is initialized
 */
export declare function isVaultInitialized(chainsPath?: string): boolean;
/**
 * Get API key for provider - tries multiple sources in order:
 * 1. Environment variable
 * 2. Vault (if initialized and password provided)
 * 3. Config file
 */
export declare function getProviderApiKey(providerName: ProviderName, options?: {
    vaultPassword?: string;
    envPrefix?: string;
}): Promise<string | null>;
