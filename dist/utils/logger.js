import chalk from "chalk";
export const log = {
    info: (msg) => console.log(chalk.blue("ℹ"), msg),
    success: (msg) => console.log(chalk.green("✓"), msg),
    warn: (msg) => console.log(chalk.yellow("⚠"), msg),
    error: (msg) => console.log(chalk.red("✗"), msg),
    block: (chain, index, hash) => console.log(chalk.green("✓"), chalk.dim(`[${chain}#${index}]`), chalk.dim(hash.slice(0, 12) + "...")),
    chain: (name, count) => console.log(chalk.cyan("⛓"), `${name}`, chalk.dim(`(${count} blocks)`)),
};
//# sourceMappingURL=logger.js.map