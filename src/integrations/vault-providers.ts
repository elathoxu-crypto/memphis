/**
 * Vault Integration with Providers
 * 
 * This module shows how Memphis can automatically retrieve API keys from vault
 * instead of using environment variables.
 */

import { Store } from "../memory/store.js";
import { decrypt } from "../utils/crypto.js";
import { loadConfig } from "../config/loader.js";
import path from "node:path";

// Vault key names for each provider
export const VAULT_KEYS = {
  openai: "openai-api-key",
  openrouter: "openrouter-api-key",
  minimax: "minimax-api-key",
} as const;

export type ProviderName = keyof typeof VAULT_KEYS;

/**
 * Get secret from vault by key name
 * Requires password to decrypt
 */
export function getVaultSecret(
  keyName: string,
  password: string,
  chainsPath?: string
): string | null {
  const config = loadConfig();
  const basePath = chainsPath || config.memory?.path || path.join(process.env.HOME!, ".memphis/chains");
  const store = new Store(basePath);
  
  // Find all blocks with this key
  const blocks = store.readChain("vault")
    .filter(b => b.data.type === "vault" && b.data.content === keyName);
  
  if (blocks.length === 0) {
    return null;
  }
  
  // Get latest non-revoked block
  const latest = blocks[blocks.length - 1];
  if ((latest.data as any).revoked) {
    return null;
  }
  
  try {
    return decrypt(latest.data.encrypted!, password);
  } catch {
    return null;
  }
}

/**
 * Check if vault is initialized
 */
export function isVaultInitialized(chainsPath?: string): boolean {
  const config = loadConfig();
  const basePath = chainsPath || config.memory?.path || path.join(process.env.HOME!, ".memphis/chains");
  const store = new Store(basePath);
  
  const vaultBlocks = store.readChain("vault");
  return vaultBlocks.length > 0;
}

/**
 * Get API key for provider - tries multiple sources in order:
 * 1. Environment variable
 * 2. Vault (if initialized and password provided)
 * 3. Config file
 */
export async function getProviderApiKey(
  providerName: ProviderName,
  options?: {
    vaultPassword?: string;
    envPrefix?: string;
  }
): Promise<string | null> {
  const envKey = (options?.envPrefix || "") + getEnvKeyForProvider(providerName);
  
  // 1. Try environment variable first
  if (process.env[envKey]) {
    return process.env[envKey];
  }
  
  // 2. Try vault
  if (options?.vaultPassword && isVaultInitialized()) {
    const vaultKey = VAULT_KEYS[providerName];
    const secret = getVaultSecret(vaultKey, options.vaultPassword);
    if (secret) {
      return secret;
    }
  }
  
  // 3. Try config
  const config = loadConfig();
  const providerConfig = config.providers?.[providerName];
  if (providerConfig?.api_key) {
    return providerConfig.api_key;
  }
  
  return null;
}

function getEnvKeyForProvider(providerName: ProviderName): string {
  const mapping: Record<ProviderName, string> = {
    openai: "OPENAI_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    minimax: "MINIMAX_API_KEY",
  };
  return mapping[providerName];
}

// === Example Usage ===
/*
// Example 1: Manual usage in your code
import { getProviderApiKey, isVaultInitialized } from "./integrations/vault-providers.js";

async function callOpenAI() {
  // Check if vault exists
  if (!isVaultInitialized()) {
    console.log("Please run: memphis vault init");
    return;
  }
  
  // Get API key from vault
  const apiKey = await getProviderApiKey("openai", {
    vaultPassword: "my-vault-password",
  });
  
  if (!apiKey) {
    console.log("No API key found. Add with: memphis vault add openai-api-key sk-...");
    return;
  }
  
  // Use the key
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    // ...
  });
}


// Example 2: Automatic provider initialization
import { OpenAIProvider } from "./providers/openai.js";

function createProviderWithVault() {
  const apiKey = getProviderApiKey("openai", {
    vaultPassword: process.env.VAULT_PASSWORD,
  }).catch(() => null);
  
  return new OpenAIProvider(); // Will use env or fallback
}


// Example 3: Using with Memphis ask command
// In your ask command handler:
async function handleAsk(question: string) {
  const vaultPassword = process.env.MEMPHIS_VAULT_PASSWORD;
  
  // Get all provider keys from vault
  const openaiKey = await getProviderApiKey("openai", { vaultPassword });
  const openrouterKey = await getProviderApiKey("openrouter", { vaultPassword });
  
  // Choose provider based on availability
  if (openaiKey) {
    // Use OpenAI
  } else if (openrouterKey) {
    // Use OpenRouter
  } else {
    // Use local Ollama
  }
}
*/

// === CLI Integration Example ===
/*
// Add to your CLI a new command:
memphis ask "summarize this" --use-vault

// This would:
// 1. Read VAULT_PASSWORD from env
// 2. Get API key from vault
// 3. Make the API call
// 4. Return result
*/
