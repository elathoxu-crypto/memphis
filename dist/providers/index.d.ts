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
    chat(messages: LLMMessage[], options?: {
        model?: string;
        temperature?: number;
        max_tokens?: number;
    }): Promise<LLMResponse>;
    isConfigured(): boolean;
}
export { BaseProvider } from "./base.js";
export declare function registerProvider(name: string, provider: Provider): void;
export declare function getProvider(name: string): Provider | undefined;
export declare function listProviders(): string[];
export { OpenRouterProvider } from "./openrouter.js";
export { MiniMaxProvider } from "./minimax.js";
export { OllamaProvider } from "./ollama.js";
export { OpenAIProvider } from "./openai.js";
export { CodexProvider } from "./codex.js";
export { OpenClawProvider } from "./openclaw.js";
export { OfflineDetector, FallbackChain, ContextCache, getRecommendedOfflineModel, getOfflineModels } from "./offline.js";
export type { NetworkStatus, OfflineConfig, FallbackChainResult } from "./offline.js";
