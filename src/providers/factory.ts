/**
 * ProviderFactory — centralized LLM provider resolution
 *
 * Eliminates duplicated provider-selection logic spread across:
 *   - src/core/ask.ts
 *   - src/core/decision-detector.ts
 *   - src/bridges/openclaw.ts
 *   - src/cli/commands/bot.ts
 *
 * Resolution order (default):
 *   1. Explicit provider/model in options
 *   2. Configured provider preferences (currently Ollama from config)
 *   3. OpenClaw gateway (if available and not offline)
 *   4. Codex (if OPENAI_API_KEY or codex CLI present)
 *   5. OpenAI (if OPENAI_API_KEY)
 *   6. OpenRouter (if OPENROUTER_API_KEY)
 *   7. MiniMax (if MINIMAX_API_KEY)
 *   8. Ollama (local fallback, always available)
 */

import { OllamaProvider } from "./ollama.js";
import { OpenAIProvider } from "./openai.js";
import { OpenRouterProvider } from "./openrouter.js";
import { CodexProvider } from "./codex.js";
import { OpenClawProvider, isGatewayAvailable } from "./openclaw.js";
import { MiniMaxProvider } from "./minimax.js";
import type { Provider } from "./index.js";
import { getProviderApiKey } from "../integrations/vault-providers.js";
import { loadConfig } from "../config/loader.js";

export type ProviderName = "openclaw" | "codex" | "openai" | "openrouter" | "minimax" | "ollama";

export interface ProviderOptions {
  /** Explicitly request a provider by name */
  provider?: string;
  /** Explicitly request a model (passed to provider) */
  model?: string;
  /** Vault password for encrypted API keys */
  vaultPassword?: string;
  /** Skip OpenClaw gateway check */
  skipOpenClaw?: boolean;
  /** Skip Codex */
  skipCodex?: boolean;
  /** Offline-only mode — return Ollama immediately */
  offlineOnly?: boolean;
}

export interface ResolvedProvider {
  provider: Provider;
  name: ProviderName;
  model?: string;
}

async function tryGetApiKey(
  providerName: "openai" | "openrouter" | "minimax",
  vaultPassword?: string
): Promise<string | undefined> {
  // 1. Environment variable
  const envMap: Record<string, string> = {
    openai: "OPENAI_API_KEY",
    openrouter: "OPENROUTER_API_KEY",
    minimax: "MINIMAX_API_KEY",
  };
  const envKey = process.env[envMap[providerName]];
  if (envKey) return envKey;

  // 2. Vault
  if (vaultPassword) {
    try {
      const vaultKey = await getProviderApiKey(providerName, { vaultPassword });
      if (vaultKey) return vaultKey;
    } catch {
      // vault not initialized or wrong password — skip
    }
  }

  return undefined;
}

/**
 * Resolve the best available LLM provider given options.
 *
 * Throws only if no provider is available at all (extremely rare — Ollama always works).
 */
export async function resolveProvider(options: ProviderOptions = {}): Promise<ResolvedProvider> {
  const { provider: requested, model, vaultPassword, skipOpenClaw, skipCodex, offlineOnly } = options;

  // Offline-only shortcut
  if (offlineOnly) {
    return { provider: new OllamaProvider(), name: "ollama", model };
  }

  // Explicit provider requested
  if (requested) {
    return resolveExplicit(requested, model, vaultPassword);
  }

  // Auto-resolution chain

  const config = loadConfig();

  if (config.providers?.ollama?.url) {
    process.env.OLLAMA_BASE_URL = config.providers.ollama.url;
    if (config.providers.ollama.model) {
      process.env.OLLAMA_MODEL = config.providers.ollama.model;
    }
    const preferredModel = config.providers.ollama.model || "qwen2.5:3b";
    return { provider: new OllamaProvider(), name: "ollama", model: preferredModel };
  }

  const openclawAvailable = !skipOpenClaw && !process.env.MEMPHIS_OFFLINE && await isGatewayAvailable().catch(() => false);
  if (openclawAvailable) {
    return { provider: new OpenClawProvider(), name: "openclaw", model };
  }

  if (!skipCodex) {
    const codex = new CodexProvider();
    if (codex.isConfigured()) {
      return { provider: codex, name: "codex", model };
    }
  }

  const openaiKey = await tryGetApiKey("openai", vaultPassword);
  if (openaiKey) {
    process.env.OPENAI_API_KEY = openaiKey;
    return { provider: new OpenAIProvider(), name: "openai", model };
  }

  const orKey = await tryGetApiKey("openrouter", vaultPassword);
  if (orKey) {
    return { provider: new OpenRouterProvider(orKey), name: "openrouter", model };
  }

  const mmKey = await tryGetApiKey("minimax", vaultPassword);
  if (mmKey) {
    return { provider: new MiniMaxProvider(mmKey), name: "minimax", model };
  }

  return { provider: new OllamaProvider(), name: "ollama", model };
}

async function resolveExplicit(
  name: string,
  model?: string,
  vaultPassword?: string
): Promise<ResolvedProvider> {
  switch (name.toLowerCase()) {
    case "openclaw": {
      if (process.env.MEMPHIS_OFFLINE === "1") {
        throw new Error("OpenClaw gateway not available (offline mode)");
      }
      const available = await isGatewayAvailable().catch(() => false);
      if (!available) {
        throw new Error("OpenClaw gateway not available");
      }
      return { provider: new OpenClawProvider(), name: "openclaw", model };
    }
    case "codex": {
      const p = new CodexProvider();
      if (!p.isConfigured()) throw new Error("Codex not configured (no OPENAI_API_KEY or codex CLI)");
      return { provider: p, name: "codex", model };
    }
    case "openai": {
      const key = await tryGetApiKey("openai", vaultPassword);
      if (!key) throw new Error("OpenAI API key not found (env OPENAI_API_KEY or vault)");
      if (key) process.env.OPENAI_API_KEY = key;
      return { provider: new OpenAIProvider(), name: "openai", model };
    }
    case "openrouter": {
      const key = await tryGetApiKey("openrouter", vaultPassword);
      if (!key) throw new Error("OpenRouter API key not found (env OPENROUTER_API_KEY or vault)");
      return { provider: new OpenRouterProvider(key), name: "openrouter", model };
    }
    case "minimax": {
      const key = await tryGetApiKey("minimax", vaultPassword);
      if (!key) throw new Error("MiniMax API key not found (env MINIMAX_API_KEY or vault)");
      return { provider: new MiniMaxProvider(key), name: "minimax", model };
    }
    case "ollama":
      return { provider: new OllamaProvider(), name: "ollama", model };
    default:
      throw new Error(`Unknown provider: ${name}. Available: openclaw, codex, openai, openrouter, minimax, ollama`);
  }
}

/**
 * Convenience: get just the Provider instance (throws on failure).
 */
export async function getProvider(options: ProviderOptions = {}): Promise<Provider> {
  const resolved = await resolveProvider(options);
  return resolved.provider;
}
