/**
 * Environment Detection Utilities
 * Auto-detect available providers and system capabilities
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

export interface EnvironmentInfo {
  nodeVersion: string;
  ollamaDetected: boolean;
  ollamaUrl: string;
  ollamaModels: string[];
  openaiKey: boolean;
  minimaxKey: boolean;
  openrouterKey: boolean;
  zaiKey: boolean;
  homeDir: string;
}

/**
 * Detect system environment and available providers
 */
export function detectEnvironment(): EnvironmentInfo {
  const home = process.env.HOME || process.env.USERPROFILE || "/root";
  
  // Node version
  const nodeVersion = process.version;
  
  // Ollama detection
  let ollamaDetected = false;
  let ollamaUrl = "http://127.0.0.1:11434";
  let ollamaModels: string[] = [];
  
  try {
    // Check if Ollama is running
    const response = execSync(`curl -s ${ollamaUrl}/api/tags`, { 
      timeout: 2000,
      encoding: "utf8" 
    });
    const data = JSON.parse(response);
    ollamaDetected = true;
    ollamaModels = data.models?.map((m: any) => m.name) || [];
  } catch {
    ollamaDetected = false;
  }
  
  // API keys detection
  const openaiKey = !!process.env.OPENAI_API_KEY;
  const minimaxKey = !!process.env.MINIMAX_API_KEY;
  const openrouterKey = !!process.env.OPENROUTER_API_KEY;
  const zaiKey = !!(process.env.ZAI_API_KEY && process.env.ZAI_API_KEY.length === 49);
  
  return {
    nodeVersion,
    ollamaDetected,
    ollamaUrl,
    ollamaModels,
    openaiKey,
    minimaxKey,
    openrouterKey,
    zaiKey,
    homeDir: home
  };
}

/**
 * Get recommended provider based on environment
 */
export function getRecommendedProvider(env: EnvironmentInfo): {
  provider: string;
  model: string;
  reason: string;
} {
  // Prefer Ollama if available (offline-first)
  if (env.ollamaDetected && env.ollamaModels.length > 0) {
    const preferredModels = ["qwen2.5-coder", "llama3.1", "llama3", "mistral", "codellama"];
    const model = env.ollamaModels.find(m => 
      preferredModels.some(pm => m.startsWith(pm))
    ) || env.ollamaModels[0];
    
    return {
      provider: "ollama",
      model: model.split(":")[0], // Remove :latest suffix
      reason: "Local, offline-capable, no API costs"
    };
  }
  
  // Fall back to ZAI if key available (good performance/cost ratio)
  if (env.zaiKey) {
    return {
      provider: "zai",
      model: "zai/glm-5",
      reason: "Cloud-based, good performance"
    };
  }
  
  // Fall back to OpenAI if key available
  if (env.openaiKey) {
    return {
      provider: "openai",
      model: "gpt-4o-mini",
      reason: "Cloud-based, fast, reliable"
    };
  }
  
  // Fall back to MiniMax if key available
  if (env.minimaxKey) {
    return {
      provider: "minimax",
      model: "abab6.5-chat",
      reason: "Cloud-based, good performance"
    };
  }
  
  // No provider available
  return {
    provider: "none",
    model: "none",
    reason: "No providers detected - manual config required"
  };
}

/**
 * Check if embeddings model is available
 */
export function checkEmbeddingsSupport(env: EnvironmentInfo): {
  available: boolean;
  model: string;
  backend: string;
} {
  if (env.ollamaDetected) {
    const embeddingModels = ["nomic-embed-text", "mxbai-embed-large", "all-minilm"];
    const hasEmbedModel = env.ollamaModels.some(m => 
      embeddingModels.some(em => m.startsWith(em))
    );
    
    return {
      available: hasEmbedModel,
      model: hasEmbedModel ? "nomic-embed-text" : "nomic-embed-text (not pulled)",
      backend: "ollama"
    };
  }
  
  return {
    available: false,
    model: "none",
    backend: "none"
  };
}
