import chalk from "chalk";

type LogLevel = "info" | "warn" | "error" | "debug";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function currentLevel(): LogLevel {
  const env = (process.env.MEMPHIS_LOG_LEVEL ?? "info").toLowerCase() as LogLevel;
  return LEVEL_PRIORITY[env] !== undefined ? env : "info";
}

function shouldLog(level: LogLevel): boolean {
  return LEVEL_PRIORITY[level] >= LEVEL_PRIORITY[currentLevel()];
}

export const log = {
  debug: (msg: string) => {
    if (shouldLog("debug")) console.log(chalk.dim("🔍"), chalk.dim(msg));
  },
  info: (msg: string) => {
    if (shouldLog("info")) console.log(chalk.blue("ℹ"), msg);
  },
  success: (msg: string) => {
    if (shouldLog("info")) console.log(chalk.green("✓"), msg);
  },
  warn: (msg: string) => {
    if (shouldLog("warn")) console.log(chalk.yellow("⚠"), msg);
  },
  error: (msg: string) => {
    if (shouldLog("error")) console.error(chalk.red("✗"), msg);
  },
  block: (chain: string, index: number, hash: string) => {
    if (shouldLog("info"))
      console.log(
        chalk.green("✓"),
        chalk.dim(`[${chain}#${index}]`),
        chalk.dim(hash.slice(0, 12) + "...")
      );
  },
  chain: (name: string, count: number) => {
    if (shouldLog("info"))
      console.log(chalk.cyan("⛓"), `${name}`, chalk.dim(`(${count} blocks)`));
  },
};
