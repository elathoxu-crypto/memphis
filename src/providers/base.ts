// Base provider class - shared by all LLM providers
import type { LLMMessage, LLMResponse, Provider } from "./index.js";

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
