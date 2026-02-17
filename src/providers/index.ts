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

// Base provider class
export abstract class BaseProvider implements Provider {
  abstract name: string;
  abstract models: string[];
  abstract apiKey: string;
  abstract baseUrl: string;
  
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.length > 0;
  }
  
  abstract chat(messages: LLMMessage[], options?: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
  }): Promise<LLMResponse>;
  
  protected async fetch<T>(endpoint: string, body: object): Promise<T> {
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

// Built-in providers (to be implemented)
export { OpenRouterProvider } from "./openrouter.js";
export { MiniMaxProvider } from "./minimax.js";
export { OllamaProvider } from "./ollama.js";
export { OpenAIProvider } from "./openai.js";
