// Provider abstraction for LLM integrations
// Allows easy addition of new providers (OpenRouter, MiniMax, Ollama, etc.)
// Base provider class
export class BaseProvider {
    isConfigured() {
        return !!this.apiKey && this.apiKey.length > 0;
    }
    async fetch(endpoint, body) {
        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            throw new Error(`Provider error: ${response.status} ${response.statusText}`);
        }
        return response.json();
    }
}
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
// Built-in providers (to be implemented)
export { OpenRouterProvider } from "./openrouter.js";
export { MiniMaxProvider } from "./minimax.js";
export { OllamaProvider } from "./ollama.js";
export { OpenAIProvider } from "./openai.js";
//# sourceMappingURL=index.js.map