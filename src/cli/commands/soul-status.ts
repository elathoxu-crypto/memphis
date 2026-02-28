import chalk from "chalk";
import { collectSoulStatus, DEFAULT_WORKSPACE_ROOT } from "../../soul/status.js";

export interface SoulStatusCommandOptions {
  pretty?: boolean;
  workspace?: string;
}

export function soulStatusCommand(opts: SoulStatusCommandOptions = {}): void {
  const workspaceRoot = opts.workspace || DEFAULT_WORKSPACE_ROOT;
  const report = collectSoulStatus({ workspaceRoot, touchHeartbeat: true });

  if (opts.pretty) {
    printPretty(report);
  } else {
    console.log(JSON.stringify(report, null, 2));
  }

  if (!report.ok) {
    process.exitCode = 1;
  }
}

function printPretty(report: ReturnType<typeof collectSoulStatus>): void {
  console.log(chalk.bold.cyan("SOUL Status"));
  console.log(`${chalk.gray("Workspace:")} ${report.workspaceRoot}`);
  console.log(`${chalk.gray("Agent:")} ${report.identity.agent}`);
  if (report.identity.soulHash) {
    console.log(`${chalk.gray("SOUL hash:")} ${report.identity.soulHash}`);
  }
  console.log(`${chalk.gray("SOUL updated:")} ${report.identity.soulUpdated ?? "-"}`);
  console.log("");

  console.log(chalk.bold("Signals"));
  for (const signal of Object.values(report.signals)) {
    const color = signal.status === "ok" ? "green" : signal.status === "warn" ? "yellow" : "red";
    console.log(
      `  ${signal.label.padEnd(18)} ${chalk[color](signal.status.toUpperCase())}` +
      (signal.detail ? `  ${chalk.gray(signal.detail)}` : "")
    );
  }
  console.log("");

  console.log(chalk.bold("Task queue"));
  if (report.queue.length === 0) {
    console.log("  (brak zadań)");
  } else {
    for (const entry of report.queue) {
      const prefix = entry.done ? chalk.green("[x]") : chalk.yellow("[ ]");
      console.log(`  ${prefix} ${entry.text}`);
    }
  }
  console.log("");

  if (report.alerts.length === 0) {
    console.log(chalk.green("No alerts"));
  } else {
    console.log(chalk.bold.red("Alerts"));
    for (const alert of report.alerts) {
      console.log(`  • ${alert.message}`);
    }
  }

  console.log("");
  console.log(report.summary);
}
