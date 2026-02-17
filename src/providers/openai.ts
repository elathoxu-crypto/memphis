import { BaseProvider, type LLMMessage, type LLMResponse } from "./index.js";

export class OpenAIProvider extends BaseProvider {
  name = "openai";
  baseUrl = "https://api.openai.com/v1";
  models = ["gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"];
  apiKey = "";

  constructor() {
    super();
    this.apiKey = process.env.OPENAI_API_KEY || "";
    this.baseUrl = process.env.OPENAI_BASE_URL || this.baseUrl;
  }

  isConfigured(): boolean {
    return this.apiKey.startsWith("sk-");
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
