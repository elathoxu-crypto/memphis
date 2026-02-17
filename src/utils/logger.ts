import chalk from "chalk";

export const log = {
  info: (msg: string) => console.log(chalk.blue("ℹ"), msg),
  success: (msg: string) => console.log(chalk.green("✓"), msg),
  warn: (msg: string) => console.log(chalk.yellow("⚠"), msg),
  error: (msg: string) => console.log(chalk.red("✗"), msg),
  block: (chain: string, index: number, hash: string) =>
    console.log(
      chalk.green("✓"),
      chalk.dim(`[${chain}#${index}]`),
      chalk.dim(hash.slice(0, 12) + "...")
    ),
  chain: (name: string, count: number) =>
    console.log(chalk.cyan("⛓"), `${name}`, chalk.dim(`(${count} blocks)`)),
};
