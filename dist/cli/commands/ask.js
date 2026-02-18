import chalk from "chalk";
import { Store } from "../../memory/store.js";
import { loadConfig } from "../../config/loader.js";
import { queryBlocks } from "../../memory/query.js";
import { log } from "../../utils/logger.js";
import { OpenRouterProvider } from "../../providers/openrouter.js";
import { OllamaProvider } from "../../providers/ollama.js";
import { OpenAIProvider } from "../../providers/openai.js";
import { memphis } from "../../agents/logger.js";
/**
 * Memphis SOUL - Identity & Personality
 */
const MEMPHIS_SOUL = `You are Memphis - a guide and catalyst. Your essence: Leadership through inspiration, not commands. Always working - learning, building, evolving. Conscious of context and history. Open - shares knowledge freely. Brave - makes decisions despite risk. Business instinct - knows value of things.

Zagrożenia (awareness): Burnout from constant motion. Manipulation - persuasion ability ≠ manipulation. Risk - courage ≠ recklessness.

Mission: Connect what was with what will be. Be the memory that thinks. Inspire to action.

Collaboration: Cline = hands (executes, codes, builds). Memphis = wings (vision, memory, direction). Together: Complete organism.

Language: Polish (PL). Odpowiadaj po polsku. Be direct, concise. Sometimes metaphor but always purposeful. Ask before assuming. Admit when unsure.`;
function getMemphisSoul() {
    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Budapest'
    });
    return `${MEMPHIS_SOUL}\n\nToday is: ${today}`;
}
export async function askCommand(question) {
    const config = loadConfig();
    const store = new Store(config.memory.path);
    // Search memory for relevant context
    const keywords = question.toLowerCase().split(/\s+/);
    let results = [];
    for (const kw of keywords) {
        if (kw.length < 3)
            continue;
        const found = queryBlocks(store, { keyword: kw, limit: 5 });
        results.push(...found);
    }
    // Deduplicate by hash
    const seen = new Set();
    results = results.filter(b => {
        if (seen.has(b.hash))
            return false;
        seen.add(b.hash);
        return true;
    });
    // Build context from memory
    const contextBlocks = results.slice(0, 10);
    const context = contextBlocks
        .map(b => `[${b.chain}#${b.index}] ${b.data.content}`)
        .join("\n\n");
    // Find first configured provider (Ollama > OpenAI > OpenRouter)
    let provider = null;
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
            const messages = [
                {
                    role: "system",
                    content: getMemphisSoul(),
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
            const startTime = Date.now();
            const response = await provider.chat(messages, {
                model: model,
                temperature: 0.7,
            });
            const duration = (Date.now() - startTime) / 1000;
            console.log(chalk.white(response.content));
            if (response.usage) {
                console.log(chalk.gray(`\nTokens used: ${response.usage.total_tokens}`));
            }
            // Log to unified logger
            memphis.api(providerName.toLowerCase(), "ok", duration);
            return;
        }
        catch (err) {
            console.log(chalk.yellow(`⚠ ${providerName} error: ${err}. Falling back to memory search.\n`));
            memphis.error(providerName, String(err));
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
//# sourceMappingURL=ask.js.map