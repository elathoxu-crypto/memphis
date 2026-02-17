import chalk from "chalk";
import { Store } from "../../memory/store.js";
import { loadConfig } from "../../config/loader.js";
import { queryBlocks } from "../../memory/query.js";
import { log } from "../../utils/logger.js";
import { OpenRouterProvider } from "../../providers/openrouter.js";
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
    // Check for configured provider
    const providerConfig = config.providers?.openrouter;
    const hasProvider = providerConfig?.api_key || process.env.OPENROUTER_API_KEY;
    if (hasProvider) {
        try {
            const provider = new OpenRouterProvider(providerConfig?.api_key);
            const messages = [
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
            console.log(chalk.gray("🤔 Consulting memory...\n"));
            const response = await provider.chat(messages, {
                model: providerConfig?.model,
                temperature: 0.7,
            });
            console.log(chalk.white(response.content));
            if (response.usage) {
                console.log(chalk.gray(`\nTokens used: ${response.usage.total_tokens}`));
            }
            return;
        }
        catch (err) {
            console.log(chalk.yellow(`⚠ LLM error: ${err}. Falling back to memory search.\n`));
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