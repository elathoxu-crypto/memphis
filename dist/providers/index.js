// Provider abstraction for LLM integrations
// Allows easy addition of new providers (OpenRouter, MiniMax, Ollama, etc.)
// Base provider class - imported from separate file to avoid circular deps
export { BaseProvider } from "./base.js";
// Provider registry
const providers = new Map();
export function registerProvider(name, provider) {
    providers.set(name, provider);
}
export function getProvider(name) {
    return providers.get(name);
}
export function listProviders() {
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
//# sourceMappingURL=index.js.map