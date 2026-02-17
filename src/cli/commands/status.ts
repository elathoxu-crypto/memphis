import { Store } from "../../memory/store.js";
import { verifyChain } from "../../memory/chain.js";
import { loadConfig, type MemphisConfig } from "../../config/loader.js";
import { log } from "../../utils/logger.js";
import chalk from "chalk";

export async function statusCommand() {
  const config = loadConfig();
  const store = new Store(config.memory.path);

  console.log();
  console.log(chalk.bold("  Memphis 🧠"));
  console.log(chalk.dim("  Local-first AI brain with persistent memory"));
  console.log();

  // Chains
  const chains = store.listChains();
  if (chains.length === 0) {
    log.warn("No chains yet. Start with: memphis journal \"hello world\"");
  } else {
    console.log(chalk.bold("  Chains:"));
    for (const chain of chains) {
      const blocks = store.readChain(chain);
      const { valid, broken_at } = verifyChain(blocks);
      const status = valid
        ? chalk.green("✓ valid")
        : chalk.red(`✗ broken at block ${broken_at}`);
      console.log(`    ${chalk.cyan("⛓")} ${chain} — ${blocks.length} blocks — ${status}`);
    }
  }

  console.log();

  // Providers
  const providers = Object.entries(config.providers || {});
  if (providers.length === 0) {
    log.warn("No providers configured. Add to ~/.memphis/config.yaml");
  } else {
    console.log(chalk.bold("  Providers:"));
    for (const [name, p] of providers) {
      const hasKey = p.api_key && p.api_key.length > 0;
      const status = hasKey ? chalk.green("✓ key set") : chalk.red("✗ no key");
      console.log(`    ${name} — ${p.model || "?"} — ${p.role || "?"} — ${status}`);
    }
  }

  console.log();
}
