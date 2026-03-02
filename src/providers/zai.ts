/**
 * ZAI Provider (GLM models)
 * 
 * Supports GLM-4.5, GLM-5, etc. via ZAI API
 * API key: 49 characters
 */

import { BaseProvider } from "./base.js";
import type { LLMMessage, LLMResponse } from "./index.js";

export class ZAIProvider extends BaseProvider {
  name = "zai";
  baseUrl = "https://api.zukijourney.com/v1";
  models = ["zai/glm-5", "zai/glm-4.7", "zai/glm-4.6", "zai/glm-4.5-air"];
  apiKey = "";
  
  private model: string;

  constructor(options?: {
    apiKey?: string;
    model?: string;
    baseUrl?: string;
  }) {
    super();
    this.apiKey = options?.apiKey || process.env.ZAI_API_KEY || "";
    this.model = options?.model || "zai/glm-5";
    this.baseUrl = options?.baseUrl || this.baseUrl;
  }

  isConfigured(): boolean {
    return this.apiKey.length === 49;
  }

  async chat(
    messages: LLMMessage[],
    options?: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<LLMResponse> {
    const model = options?.model || this.model;
    
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? 2000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ZAI API error (${response.status}): ${error}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0
      }
    };
  }

  async listModels(): Promise<string[]> {
    return this.models;
  }
}
