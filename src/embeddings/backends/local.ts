import type { Block } from "../../memory/chain.js";
import type { EmbeddingBackend } from "../service.js";

const DEFAULT_OLLAMA_URL = process.env.MEMPHIS_OLLAMA_URL || "http://127.0.0.1:11434";
const DEFAULT_EMBED_MODEL = process.env.MEMPHIS_EMBED_MODEL || "nomic-embed-text";

interface OllamaEmbedResponse {
  embedding?: number[];
  data?: { embedding: number[] }[];
}

export class LocalOllamaBackend implements EmbeddingBackend {
  readonly name = "local-ollama";
  readonly model: string;
  private initialized = false;

  constructor(private readonly baseUrl = DEFAULT_OLLAMA_URL, model = DEFAULT_EMBED_MODEL) {
    this.model = model;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await this.ping();
    this.initialized = true;
  }

  async embedBlocks(blocks: Block[]): Promise<number[][]> {
    const vectors: number[][] = [];

    for (const block of blocks) {
      const input = (block.data.content || "").trim();
      const vector = await this.embedText(input);
      vectors.push(vector);
    }

    return vectors;
  }

  private async ping() {
    const res = await fetch(`${this.baseUrl}/api/tags`, {
      method: "GET",
    });

    if (!res.ok) {
      throw new Error(`Ollama backend not reachable (${res.status} ${res.statusText})`);
    }
  }

  private async embedText(input: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, input }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Ollama embed failed (${res.status}): ${body}`);
    }

    const json = (await res.json()) as OllamaEmbedResponse & { embeddings?: number[][] };

    if (Array.isArray(json.embedding)) {
      return json.embedding;
    }

    if (Array.isArray(json.embeddings) && Array.isArray(json.embeddings[0])) {
      return json.embeddings[0] as number[];
    }

    if (Array.isArray(json.data) && json.data[0]?.embedding) {
      return json.data[0].embedding;
    }

    throw new Error("Ollama embed returned no embedding data");
  }
}
