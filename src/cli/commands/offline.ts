import { loadOfflineConfig, saveOfflineConfig, type OfflineConfig } from "../../offline/config.js";
import { OfflineDetector } from "../../providers/offline.js";
import chalk from "chalk";

export async function offlineStatusCommand(): Promise<void> {
  const config = loadOfflineConfig();
  const detector = new OfflineDetector();
  const network = await detector.detect();

  console.log();
  console.log(chalk.bold("  Memphis Offline Mode"));
  console.log(chalk.dim("  ─────────────────────"));

  console.log(`  Mode:          ${formatMode(config.enabled)}`);
  console.log(`  Network:       ${formatNetwork(network)}`);
  console.log(`  Active Model:  ${chalk.cyan(config.preferredModel)}`);
  console.log();

  if (config.enabled === "auto") {
    console.log(chalk.dim("  Auto-detection active — will switch based on network status."));
  } else if (config.enabled === "on") {
    console.log(chalk.dim("  Forced offline — always uses local models."));
  } else {
    console.log(chalk.dim("  Forced online — requires internet connection."));
  }
  console.log();

  if (config.fallbackModels.length > 0) {
    console.log(chalk.dim("  Fallback chain:"));
    for (const model of config.fallbackModels) {
      console.log(`    • ${model}`);
    }
    console.log();
  }
}

export async function offlineOnCommand(): Promise<void> {
  const config = saveOfflineConfig({ enabled: "on" });
  console.log();
  console.log(chalk.green("  ✓ Offline mode forced ON"));
  console.log(chalk.dim(`  Preferred model: ${config.preferredModel}`));
  console.log();
}

export async function offlineAutoCommand(): Promise<void> {
  const config = saveOfflineConfig({ enabled: "auto" });
  const detector = new OfflineDetector();
  const network = await detector.detect();

  console.log();
  console.log(chalk.green("  ✓ Auto-detection enabled"));
  console.log(chalk.dim(`  Current network: ${network}`));
  console.log(chalk.dim(`  Preferred model: ${config.preferredModel}`));
  console.log();
}

export async function offlineOffCommand(): Promise<void> {
  const config = saveOfflineConfig({ enabled: "off" });
  console.log();
  console.log(chalk.green("  ✓ Online mode forced (offline disabled)"));
  console.log(chalk.dim(`  Will use online providers when available.`));
  console.log();
}

export async function offlineModelCommand(model: string): Promise<void> {
  if (!model || model.trim().length === 0) {
    console.log(chalk.red("  ✗ Model name required"));
    console.log(chalk.dim("  Usage: memphis offline model <name>"));
    console.log(chalk.dim("  Example: memphis offline model qwen2.5-coder:3b"));
    process.exit(1);
  }

  const trimmed = model.trim();
  const config = saveOfflineConfig({ preferredModel: trimmed });

  console.log();
  console.log(chalk.green("  ✓ Preferred offline model set"));
  console.log(chalk.dim(`  Model: ${config.preferredModel}`));
  console.log();
}

function formatMode(mode: OfflineConfig["enabled"]): string {
  switch (mode) {
    case "on":
      return chalk.yellow("ON (forced)");
    case "off":
      return chalk.blue("OFF (forced online)");
    case "auto":
      return chalk.green("AUTO");
    default:
      return chalk.gray(mode);
  }
}

function formatNetwork(status: string): string {
  switch (status) {
    case "online":
      return chalk.green("● Online");
    case "offline":
      return chalk.red("● Offline");
    case "checking":
      return chalk.yellow("● Checking...");
    default:
      return chalk.gray(status);
  }
}
