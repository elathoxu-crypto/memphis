import chalk from "chalk";
import { Store } from "../../memory/store.js";
import { loadConfig } from "../../config/loader.js";
import { queryBlocks } from "../../memory/query.js";
import { log } from "../../utils/logger.js";
import { OpenRouterProvider } from "../../providers/openrouter.js";
import { OllamaProvider } from "../../providers/ollama.js";
import { OpenAIProvider } from "../../providers/openai.js";
import type { LLMMessage } from "../../providers/index.js";

export async function askCommand(question: string) {
  const config = loadConfig();
  const store = new Store(config.memory.path);

  // Search memory for relevant context
  const keywords = question.toLowerCase().split(/\s+/);
  let results: any[] = [];

  for (const kw of keywords) {
    if (kw.length < 3) continue;
    const found = queryBlocks(store, { keyword: kw, limit: 5 });
    results.push(...found);
  }

  // Deduplicate by hash
  const seen = new Set<string>();
  results = results.filter(b => {
    if (seen.has(b.hash)) return false;
    seen.add(b.hash);
    return true;
  });

  // Build context from memory
  const contextBlocks = results.slice(0, 10);
  const context = contextBlocks
    .map(b => `[${b.chain}#${b.index}] ${b.data.content}`)
    .join("\n\n");

  // Find first configured provider (Ollama > OpenAI > OpenRouter)
  let provider: any = null;
  let providerName = "";
  let model = "";

  // Try Ollama first (local, free)
  const ollamaConfig = config.providers?.ollama;
  if (ollamaConfig) {
    provider = new OllamaProvider();
    providerName = "Ollama";
    model = ollamaConfig?.model || "llama3.1";
  }

  // Try OpenAI
  if (!provider) {
    const openaiConfig = config.providers?.openai;
    if (openaiConfig?.api_key || process.env.OPENAI_API_KEY) {
      provider = new OpenAIProvider();
      providerName = "OpenAI";
      model = openaiConfig?.model || "gpt-4o";
    }
  }

  // Try OpenRouter as fallback
  if (!provider) {
    const openrouterConfig = config.providers?.openrouter;
    if (openrouterConfig?.api_key || process.env.OPENROUTER_API_KEY) {
      provider = new OpenRouterProvider(openrouterConfig?.api_key);
      providerName = "OpenRouter";
      model = openrouterConfig?.model || "anthropic/claude-sonnet-4";
    }
  }

  if (provider && provider.isConfigured()) {
    try {
      const messages: LLMMessage[] = [
        {
          role: "system",
          content: `You are Memphis, an AI assistant with access to the user's memory chains. 
Use the provided context from memory to answer the question. If the context doesn't contain 
relevant information, say so honestly. Be concise and helpful.`,
        },
      ];

      if (context) {
        messages.push({
          role: "system",
          content: `Relevant memory context:\n${context}`,
        });
      }

      messages.push({
        role: "user",
        content: question,
      });

      console.log(chalk.gray(`🤔 Consulting ${providerName} (${model})...\n`));
      const response = await provider.chat(messages, {
        model: model,
        temperature: 0.7,
      });

      console.log(chalk.white(response.content));
      
      if (response.usage) {
        console.log(chalk.gray(`\nTokens used: ${response.usage.total_tokens}`));
      }
      return;
    } catch (err) {
      console.log(chalk.yellow(`⚠ ${providerName} error: ${err}. Falling back to memory search.\n`));
    }
  }

  // Fallback: display memory results without LLM
  if (results.length === 0) {
    log.warn("No relevant blocks found in memory.");
    log.info("Tip: add context with 'memphis journal \"...\"'");
    return;
  }

  log.info(`Found ${results.length} relevant blocks:`);
  for (const block of results.slice(0, 10)) {
    console.log();
    log.block(block.chain, block.index, block.hash);
    console.log(`  ${block.data.content.slice(0, 200)}`);
    if (block.data.tags.length > 0) {
      console.log(`  tags: ${block.data.tags.join(", ")}`);
    }
  }
}
