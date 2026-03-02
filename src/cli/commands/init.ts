import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MEMPHIS_HOME, CONFIG_PATH, CHAINS_PATH, EMBEDDINGS_PATH } from "../../config/defaults.js";
import { log } from "../../utils/logger.js";
import { promptHidden, promptYesNo } from "../utils/prompt.js";
import { sha256 } from "../../utils/hash.js";
import { detectEnvironment, getRecommendedProvider, checkEmbeddingsSupport } from "../../utils/environment.js";
import chalk from "chalk";

const DEFAULT_YAML = `# Memphis configuration
# Docs: https://github.com/oswobodzeni/memphis

providers:
  # Uncomment and configure your LLM provider:
  #
  # minimax:
  #   url: https://api.minimax.chat/v1
  #   model: minimax-text-01
  #   api_key: \${MINIMAX_API_KEY}
  #   role: primary
  #
  # openrouter:
  #   url: https://openrouter.ai/api/v1
  #   model: anthropic/claude-sonnet-4
  #   api_key: \${OPENROUTER_API_KEY}
  #   role: fallback
  #
  # ollama:
  #   url: http://localhost:11434/v1
  #   model: llama3.1
  #   role: offline

memory:
  path: ${CHAINS_PATH}
  auto_git: false

embeddings:
  enabled: false
  backend: ollama
  model: nomic-embed-text-v1
  storage_path: ${EMBEDDINGS_PATH}
  top_k: 8
  semantic_weight: 0.5

agents:
  journal:
    chain: journal
    context_window: 20
  builder:
    chain: build
    context_window: 30
  architect:
    chain: adr
    context_window: 15
  ops:
    chain: ops
    context_window: 10
`;

const SECURITY_STATE_PATH = join(MEMPHIS_HOME, "security.json");

interface SecurityState {
  passwordSet: boolean;
  passwordHash: string | null;
  allowEmpty: boolean;
  createdAt: string;
  updatedAt?: string;
}

function saveSecurityState(state: SecurityState) {
  writeFileSync(SECURITY_STATE_PATH, JSON.stringify(state, null, 2), { mode: 0o600 });
}

async function promptForPassword(): Promise<SecurityState | null> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return null;
  }

  const wantsPassword = await promptYesNo("Set a default Memphis password now? (y/N): ", false);
  const baseState: SecurityState = {
    passwordSet: false,
    passwordHash: null,
    allowEmpty: true,
    createdAt: new Date().toISOString(),
  };

  if (!wantsPassword) {
    return baseState;
  }

  const password = await promptHidden("Enter password (leave blank to skip): ");
  if (!password) {
    log.warn("Empty password entered. Skipping password setup.");
    return baseState;
  }

  const confirm = await promptHidden("Confirm password: ");
  if (password !== confirm) {
    log.warn("Passwords did not match. Skipping password setup.");
    return baseState;
  }

  return {
    passwordSet: true,
    passwordHash: sha256(password),
    allowEmpty: false,
    createdAt: new Date().toISOString(),
  };
}

export async function initCommand() {
  if (existsSync(CONFIG_PATH)) {
    log.warn(`Config already exists: ${CONFIG_PATH}`);
    return;
  }

  // ─── Interactive Setup Wizard ─────────────────────────────────────────────
  console.log(chalk.bold.cyan("\n╔═══════════════════════════════════════════════════════════╗"));
  console.log(chalk.bold.cyan("║") + "           " + chalk.bold.white("Memphis Brain — Setup Wizard 🧠") + "                " + chalk.bold.cyan("║"));
  console.log(chalk.bold.cyan("╚═══════════════════════════════════════════════════════════╝\n"));

  // Detect environment
  console.log(chalk.gray("🔍 Detecting environment...\n"));
  const env = detectEnvironment();
  
  console.log(`  ${chalk.green("✓")} Node.js ${env.nodeVersion}`);
  console.log(`  ${env.ollamaDetected ? chalk.green("✓") : chalk.red("✗")} Ollama ${env.ollamaDetected ? `(${env.ollamaUrl})` : "(not detected)"}`);
  if (env.ollamaDetected && env.ollamaModels.length > 0) {
    console.log(chalk.gray(`    Available models: ${env.ollamaModels.slice(0, 3).join(", ")}${env.ollamaModels.length > 3 ? "..." : ""}`));
  }
  console.log(`  ${env.openaiKey ? chalk.green("✓") : chalk.yellow("⚠")} OpenAI API key ${env.openaiKey ? "" : "(not found)"}`);
  console.log(`  ${env.minimaxKey ? chalk.green("✓") : chalk.yellow("⚠")} MiniMax API key ${env.minimaxKey ? "" : "(not found)"}`);
  console.log(`  ${env.openrouterKey ? chalk.green("✓") : chalk.yellow("⚠")} OpenRouter API key ${env.openrouterKey ? "" : "(not found)"}`);
  console.log("");

  // Get recommended provider
  const recommended = getRecommendedProvider(env);
  const embeddingsSupport = checkEmbeddingsSupport(env);

  // ─── Determine Provider ───────────────────────────────────────────────
  let selectedProvider = recommended.provider;
  let selectedModel = recommended.model;
  let enableEmbeddings = embeddingsSupport.available;

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    // Non-interactive mode - use recommended config
    console.log(chalk.yellow("Non-interactive mode - using recommended configuration"));
    console.log(`  Provider: ${selectedProvider}/${selectedModel} (${recommended.reason})`);
    console.log(`  Embeddings: ${enableEmbeddings ? "enabled" : "disabled"}`);
    console.log("");
  } else {
    // Interactive mode - ask user
    if (recommended.provider !== "none") {
      console.log(chalk.cyan("?") + ` Recommended provider: ${chalk.bold(selectedProvider)}/${selectedModel}`);
      console.log(chalk.gray(`  Reason: ${recommended.reason}`));
      
      const useRecommended = await promptYesNo("  Use recommended? (Y/n): ", true);
      
      if (!useRecommended) {
        console.log(chalk.yellow("\n  Manual configuration required."));
        console.log(chalk.gray("  Edit ~/.memphis/config.yaml after setup.\n"));
        selectedProvider = "manual";
      }
    } else {
      console.log(chalk.yellow("\n⚠ No providers detected."));
      console.log(chalk.gray("  You'll need to manually configure ~/.memphis/config.yaml after setup.\n"));
      selectedProvider = "manual";
    }

    // ─── Embeddings ─────────────────────────────────────────────────────
    if (selectedProvider !== "manual" && embeddingsSupport.available) {
      enableEmbeddings = await promptYesNo(chalk.cyan("?") + " Enable embeddings (semantic search)? (Y/n): ", true);
    } else if (!embeddingsSupport.available) {
      console.log(chalk.gray("  Embeddings: unavailable (requires Ollama + nomic-embed-text)"));
      enableEmbeddings = false;
    }

    // ─── Auto-summarization ─────────────────────────────────────────────
    const enableAutosummary = selectedProvider !== "manual" 
      ? await promptYesNo(chalk.cyan("?") + " Enable auto-summarization? (Y/n): ", true)
      : false;

    console.log("");
  }

  // ─── Create Configuration ───────────────────────────────────────────────
  mkdirSync(MEMPHIS_HOME, { recursive: true });
  mkdirSync(CHAINS_PATH, { recursive: true });

  // Generate config YAML based on selections
  const configYaml = generateConfigYaml(selectedProvider, selectedModel, enableEmbeddings);
  writeFileSync(CONFIG_PATH, configYaml, "utf-8");

  // ─── Security Setup ─────────────────────────────────────────────────────
  const securityState = await promptForPassword();
  if (securityState) {
    saveSecurityState(securityState);
    log.info(securityState.passwordSet
      ? "Vault password preference saved (hash stored locally)."
      : "Passwordless mode recorded. You can set one later with 'memphis vault init' + security tools.");
  } else {
    log.info("Skipping password prompt (non-interactive). Run 'memphis init' in a TTY or create ~/.memphis/security.json manually.");
  }

  // ─── Success Summary ───────────────────────────────────────────────────
  console.log(chalk.green("\n✓") + ` Created ${CONFIG_PATH}`);
  console.log(chalk.green("✓") + ` Created ${CHAINS_PATH}`);
  console.log("");

  // ─── First Memory Prompt ────────────────────────────────────────────────
  if (process.stdin.isTTY && selectedProvider !== "manual") {
    console.log(chalk.bold.cyan("╔═══════════════════════════════════════════════════════════╗"));
    console.log(chalk.bold.cyan("║") + "            " + chalk.bold.white("Let's create your first memory! 🎯") + "           " + chalk.bold.cyan("║"));
    console.log(chalk.bold.cyan("╚═══════════════════════════════════════════════════════════╝\n"));

    // This is where we'd prompt for first memory, but we need journal command access
    // For now, show next steps
    console.log(chalk.gray("Next steps:"));
    console.log(chalk.white("  • memphis journal \"Your thoughts\" — save memories"));
    console.log(chalk.white("  • memphis ask \"question\" — query your brain"));
    console.log(chalk.white("  • memphis recall \"keyword\" — semantic search"));
    console.log(chalk.white("  • memphis tui — visual dashboard"));
    console.log("");
    console.log(chalk.gray("Docs: https://github.com/elathoxu-crypto/memphis"));
    console.log(chalk.gray("Chat: https://discord.gg/clawd"));
    console.log(chalk.bold.green("\nReady? Let's go! 🚀\n"));
  } else {
    log.info("Edit ~/.memphis/config.yaml to add your LLM provider");
    log.info("Then run: memphis journal \"hello world\"");
  }
}

function generateConfigYaml(provider: string, model: string, embeddings: boolean): string {
  if (provider === "manual" || provider === "none") {
    return DEFAULT_YAML;
  }

  let yaml = `# Memphis configuration\n`;
  yaml += `# Generated by setup wizard\n\n`;
  
  // Provider config
  yaml += `providers:\n`;
  if (provider === "ollama") {
    yaml += `  ollama:\n`;
    yaml += `    url: http://127.0.0.1:11434/v1\n`;
    yaml += `    model: ${model}\n`;
    yaml += `    role: primary\n`;
  } else if (provider === "openai") {
    yaml += `  openai:\n`;
    yaml += `    url: https://api.openai.com/v1\n`;
    yaml += `    model: ${model}\n`;
    yaml += `    api_key: \${OPENAI_API_KEY}\n`;
    yaml += `    role: primary\n`;
  } else if (provider === "minimax") {
    yaml += `  minimax:\n`;
    yaml += `    url: https://api.minimax.chat/v1\n`;
    yaml += `    model: ${model}\n`;
    yaml += `    api_key: \${MINIMAX_API_KEY}\n`;
    yaml += `    role: primary\n`;
  }
  
  yaml += `\nmemory:\n`;
  yaml += `  path: ${CHAINS_PATH}\n`;
  yaml += `  auto_git: false\n`;
  
  yaml += `\nembeddings:\n`;
  yaml += `  enabled: ${embeddings}\n`;
  yaml += `  backend: local-ollama\n`;
  yaml += `  model: nomic-embed-text\n`;
  yaml += `  storage_path: ${EMBEDDINGS_PATH}\n`;
  yaml += `  top_k: 8\n`;
  yaml += `  semantic_weight: 0.5\n`;
  
  return yaml;
}
