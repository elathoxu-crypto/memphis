import chalk from "chalk";
import { Store } from "../../memory/store.js";
import { loadConfig } from "../../config/loader.js";
import { askWithContext, type AskOptions } from "../../core/ask.js";
import { checkAndSaveDecision } from "../../core/decision-detector.js";
import { memphis } from "../../agents/logger.js";

export async function askCommand(question: string, options?: {
  useVault?: boolean;
  vaultPassword?: string;
  model?: string;
  top?: number;
  since?: string;
  provider?: string;
  includeVault?: boolean;
  noSave?: boolean;
  json?: boolean;
  preferSummaries?: boolean;
  noSummaries?: boolean;
  summariesMax?: number;
  explainContext?: boolean;
  semanticWeight?: number;
  semanticOnly?: boolean;
  noSemantic?: boolean;
}) {
  const config = loadConfig();
  const store = new Store(config.memory.path);

  const askOptions: AskOptions = {
    question,
    provider: options?.provider || options?.model, // model flag maps to provider (ollama)
    includeVault: options?.includeVault || options?.useVault || false,
    topK: options?.top || 8,
    since: options?.since,
    noSave: options?.noSave || false,
    json: options?.json || false,
    // For boolean flags with --no- prefix, check if explicitly set
    preferSummaries: options?.preferSummaries === true,
    noSummaries: options?.noSummaries === true,
    summariesMax: options?.summariesMax || 2,
    explainContext: options?.explainContext,
    semanticWeight: options?.semanticWeight,
    semanticOnly: options?.semanticOnly,
    disableSemantic: options?.noSemantic,
  };

  // Pass vault password via special option (not in AskOptions interface)
  const vaultPassword = options?.vaultPassword || process.env.VAULT_PASSWORD;

  try {
    const startTime = Date.now();
    const result = await askWithContext(store, askOptions);
    const duration = (Date.now() - startTime) / 1000;

    if (options?.json) {
      // JSON output
      console.log(JSON.stringify({
        answer: result.answer,
        provider: result.provider,
        model: result.model,
        tokens_used: result.tokens_used,
        context: result.context,
      }, null, 2));
    } else {
      // Human readable output
      if (result.provider === "none") {
        // No provider - show recall results only
        console.log(chalk.yellow("⚠ No LLM provider available. Showing recall results:\n"));
        for (let i = 0; i < result.context.hits.length; i++) {
          const hit = result.context.hits[i];
          console.log(chalk.gray(`[${i + 1}] ${hit.chain}#${String(hit.index).padStart(6, "0")} (score=${hit.score})`));
          console.log(`    ${hit.snippet}`);
          console.log();
        }
      } else {
        // Show answer
        console.log(chalk.white(result.answer));
        
        // Show context info
        console.log(chalk.gray(`\n📚 Context: ${result.context.hits.length} hits`));
        console.log(chalk.gray(`🤖 Provider: ${result.provider} (${result.model})`));
        
        if (result.tokens_used) {
          console.log(chalk.gray(`💬 Tokens: ${result.tokens_used}`));
        }
        
        if (!askOptions.noSave && result.savedBlock) {
          console.log(chalk.gray(`💾 Saved to: ${result.savedBlock.chain}#${String(result.savedBlock.index).padStart(6, "0")}`));
          
          // Check for decision (async, non-blocking)
          try {
            const decisionBlock = await checkAndSaveDecision(store, result.savedBlock);
            if (decisionBlock) {
              console.log(chalk.gray(`\n📋 Decision detected! Saved to decision#${String(decisionBlock.index).padStart(6, "0")}`));
            }
          } catch (err) {
            // Non-blocking - decision detection is best-effort
          }
        }

        // Show context hits (compact)
        if (result.context.hits.length > 0) {
          console.log(chalk.gray("\nContext hits:"));
          for (let i = 0; i < result.context.hits.length; i++) {
            const hit = result.context.hits[i];
            const tags = hit.tags.length > 0 ? ` [${hit.tags.slice(0, 2).join(", ")}]` : "";
            console.log(chalk.gray(`  ${i + 1}. ${hit.chain}#${String(hit.index).padStart(6, "0")}${tags}`));
          }
        }
      }
    }

    // Log to unified logger
    if (result.provider !== "none") {
      memphis.api(result.provider.toLowerCase(), "ok", duration);
    }
  } catch (err) {
    console.log(chalk.red(`❌ Error: ${err}`));
    memphis.error("ask", String(err));
    process.exit(1);
  }
}
