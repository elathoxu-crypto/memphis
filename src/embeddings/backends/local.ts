import type { Block } from "../../memory/chain.js";
import type { EmbeddingBackend } from "../service.js";
import { EmbeddingCache } from "../cache.js";

const DEFAULT_OLLAMA_URL = process.env.MEMPHIS_OLLAMA_URL || "http://127.0.0.1:11434";
const DEFAULT_EMBED_MODEL = process.env.MEMPHIS_EMBED_MODEL || "nomic-embed-text";
const CACHE_MAX_SIZE = parseInt(process.env.MEMPHIS_EMBED_CACHE_SIZE || "1000", 10);

interface OllamaEmbedResponse {
  embedding?: number[];
  data?: { embedding: number[] }[];
}

export class LocalOllamaBackend implements EmbeddingBackend {
  readonly name = "local-ollama";
  readonly model: string;
  private initialized = false;
  private cache: EmbeddingCache;

  constructor(private readonly baseUrl = DEFAULT_OLLAMA_URL, model = DEFAULT_EMBED_MODEL) {
    this.model = model;
    this.cache = new EmbeddingCache(CACHE_MAX_SIZE);
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await this.ping();
    this.initialized = true;
  }

  async embedBlocks(blocks: Block[]): Promise<number[][]> {
    const vectors: number[][] = [];
    const toEmbed: Array<{ index: number; text: string }> = [];

    // Check cache for each block
    for (let i = 0; i < blocks.length; i++) {
      const input = (blocks[i].data.content || "").trim();
      const cached = this.cache.get(input, this.model);

      if (cached) {
        vectors[i] = cached;
        console.error(`[EmbeddingCache] HIT for block #${blocks[i].index}`);
      } else {
        toEmbed.push({ index: i, text: input });
      }
    }

    // Batch embed uncached blocks
    if (toEmbed.length > 0) {
      console.error(`[EmbeddingCache] MISS for ${toEmbed.length} blocks, batch embedding...`);
      const batchVectors = await this.embedBatch(toEmbed.map(t => t.text));

      for (let i = 0; i < toEmbed.length; i++) {
        const { index } = toEmbed[i];
        const vector = batchVectors[i];
        vectors[index] = vector;

        // Cache for future use
        this.cache.set(toEmbed[i].text, this.model, vector);
      }
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

  /**
   * Batch embed multiple texts in one HTTP request
   * (much faster than sequential requests)
   */
  private async embedBatch(inputs: string[]): Promise<number[][]> {
    if (inputs.length === 0) return [];

    const res = await fetch(`${this.baseUrl}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, input: inputs }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Ollama batch embed failed (${res.status}): ${body}`);
    }

    const json = (await res.json()) as OllamaEmbedResponse & { embeddings?: number[][] };

    // Ollama returns { embeddings: [[...], [...]] } for batch requests
    if (Array.isArray(json.embeddings)) {
      return json.embeddings as number[][];
    }

    // Fallback: single embedding returned (old Ollama versions)
    if (Array.isArray(json.embedding)) {
      return [json.embedding];
    }

    // OpenAI-style response
    if (Array.isArray(json.data)) {
      return json.data.map(d => d.embedding);
    }

    throw new Error("Ollama batch embed returned no embedding data");
  }
}
