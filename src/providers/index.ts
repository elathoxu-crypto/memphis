// Provider abstraction for LLM integrations
// Allows easy addition of new providers (OpenRouter, MiniMax, Ollama, etc.)

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface Provider {
  name: string;
  models: string[];
  
  // Generate completion
  chat(messages: LLMMessage[], options?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<LLMResponse>;
  
  // Check if provider is configured
  isConfigured(): boolean;
}

// Base provider class - imported from separate file to avoid circular deps
export { BaseProvider } from "./base.js";

// Provider registry
const providers = new Map<string, Provider>();

export function registerProvider(name: string, provider: Provider): void {
  providers.set(name, provider);
}

export function getProvider(name: string): Provider | undefined {
  return providers.get(name);
}

export function listProviders(): string[] {
  return Array.from(providers.keys());
}

// Built-in providers
export { OpenRouterProvider } from "./openrouter.js";
export { MiniMaxProvider } from "./minimax.js";
export { OllamaProvider } from "./ollama.js";
export { OpenAIProvider } from "./openai.js";
export { CodexProvider } from "./codex.js";
export { OpenClawProvider } from "./openclaw.js";

// Offline mode support
export { OfflineDetector, FallbackChain, ContextCache, getRecommendedOfflineModel, getOfflineModels } from "./offline.js";
export type { NetworkStatus, OfflineConfig, FallbackChainResult } from "./offline.js";
