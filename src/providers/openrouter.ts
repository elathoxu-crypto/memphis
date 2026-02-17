import { BaseProvider, type LLMMessage, type LLMResponse } from "./index.js";

export class OpenRouterProvider extends BaseProvider {
  name = "openrouter";
  baseUrl = "https://openrouter.ai/api/v1";
  models = [
    "anthropic/claude-3.5-sonnet",
    "anthropic/claude-3-opus",
    "google/gemini-pro-1.5",
    "meta-llama/llama-3.1-70b-instruct",
  ];
  
  apiKey = "";
  
  constructor(apiKey?: string) {
    super();
    this.apiKey = apiKey || process.env.OPENROUTER_API_KEY || "";
  }
  
  async chat(
    messages: LLMMessage[],
    options?: {
      model?: string;
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<LLMResponse> {
    const model = options?.model || this.models[0];
    
    const response = await this.fetch<{
      choices: Array<{ message: { content: string } }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    }>("/chat/completions", {
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens,
    });
    
    return {
      content: response.choices[0]?.message?.content || "",
      usage: response.usage,
    };
  }
}
