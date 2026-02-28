import { Store } from "../../memory/store.js";
import { loadConfig } from "../../config/loader.js";
import { plan, type PlanOutputFormat } from "../../core/planner.js";
import chalk from "chalk";
import { execSync } from "node:child_process";

export async function planCommand(options: {
  focus?: string;
  goal?: string;
  since?: string;
  output?: PlanOutputFormat;
  exec?: boolean;
  yolo?: boolean;
  json?: boolean;
}) {
  const config = loadConfig();
  const store = new Store(config.memory.path);

  const output = options.json ? "json" : (options.output ?? "prompt");

  if (output !== "json") {
    console.log(chalk.cyan("🧠 Planning..."));
  }

  const task = await plan(store, {
    focus: options.focus,
    goal: options.goal,
    since: options.since,
    output,
  });

  // JSON output
  if (output === "json") {
    console.log(JSON.stringify(task, null, 2));
    return;
  }

  // Shell output — just the codex command
  if (output === "shell") {
    const flag = options.yolo ? "--yolo" : "--full-auto";
    console.log(`codex ${flag} exec '${task.codexPrompt.replace(/'/g, "'\\''")}'`);
    return;
  }

  // Human-readable prompt output
  console.log(chalk.bold(`\n📋 ${task.title}\n`));
  console.log(chalk.bold("Goal:"));
  console.log(`  ${task.goal}\n`);

  if (task.focusFiles.length) {
    console.log(chalk.bold("Focus:"));
    task.focusFiles.forEach(f => console.log(`  • ${f}`));
    console.log();
  }

  if (task.context) {
    console.log(chalk.bold("Context (from memory):"));
    task.context.split("\n").forEach(l => console.log(`  ${chalk.dim(l)}`));
    console.log();
  }

  console.log(chalk.bold("Actions:"));
  task.actions.forEach((a, i) => console.log(`  ${i + 1}. ${a}`));

  console.log(chalk.dim("\n─────────────────────────────────────"));
  console.log(chalk.bold("Codex prompt:"));
  console.log(chalk.dim(task.codexPrompt.slice(0, 300) + (task.codexPrompt.length > 300 ? "..." : "")));

  // Auto-exec with codex
  if (options.exec) {
    const flag = options.yolo ? "--yolo" : "--full-auto";
    console.log(chalk.yellow(`\n🚀 Launching codex ${flag}...\n`));
    try {
      execSync(`codex ${flag} exec '${task.codexPrompt.replace(/'/g, "'\\''")}'`, {
        stdio: "inherit",
        cwd: process.cwd(),
      });
    } catch (err) {
      console.error(chalk.red(`Codex failed: ${err}`));
      process.exit(1);
    }
  } else {
    console.log(chalk.dim("\nRun with --exec to launch codex automatically."));
    console.log(chalk.dim("Or copy the prompt above and paste into: codex --yolo exec '<prompt>'"));
  }
}
