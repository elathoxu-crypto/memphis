import { Store } from "../../memory/store.js";
import { verifyChain } from "../../memory/chain.js";
import { loadConfig } from "../../config/loader.js";
import chalk from "chalk";
export async function statusCommand() {
    const config = loadConfig();
    const store = new Store(config.memory.path);
    // Build chain info
    const chains = store.listChains();
    let chainInfo = [];
    let timestampIssues = 0;
    for (const chain of chains) {
        const blocks = store.readChain(chain);
        const { valid, soul_errors } = verifyChain(blocks);
        const errors = soul_errors ? soul_errors.filter(e => e.includes("Timestamp")).length : 0;
        timestampIssues += errors;
        chainInfo.push({
            name: chain,
            blocks: blocks.length,
            valid,
            first: blocks[0]?.timestamp?.split("T")[0],
            last: blocks[blocks.length - 1]?.timestamp?.split("T")[0],
            errors,
        });
    }
    // Calculate totals
    const totalBlocks = chainInfo.reduce((sum, c) => sum + c.blocks, 0);
    const allValid = chainInfo.every(c => c.valid);
    // Print styled status
    console.log();
    console.log(chalk.cyan("╔══════════════════════════════════════════════════════════════╗"));
    console.log(chalk.cyan("║") + chalk.bold("                    🧠 Memphis Status") + chalk.cyan("                    ║"));
    console.log(chalk.cyan("╠══════════════════════════════════════════════════════════════╣"));
    console.log(chalk.cyan("║") + chalk.dim("            Local-first AI brain with persistent memory") + chalk.cyan(" ║"));
    console.log(chalk.cyan("╠══════════════════════════════════════════════════════════════╣"));
    // Chain table
    console.log(chalk.cyan("║  Chain Status") + " ".repeat(46) + chalk.cyan("║"));
    console.log(chalk.cyan("║") + "  ┌──────────────────┬────────────┐" + " ".repeat(26) + chalk.cyan("║"));
    console.log(chalk.cyan("║") + "  │ Metric           │ Value      │" + " ".repeat(26) + chalk.cyan("║"));
    console.log(chalk.cyan("║") + "  ├──────────────────┼────────────┤" + " ".repeat(26) + chalk.cyan("║"));
    for (const c of chainInfo) {
        const name = c.name.padEnd(14);
        const blocks = c.blocks.toString().padEnd(10);
        const status = c.valid ? chalk.green("✓ OK") : chalk.red("✗ Issue");
        console.log(chalk.cyan("║") + `  │ ${name} │ ${blocks} │ ${status}${" ".repeat(36)}` + chalk.cyan("║"));
    }
    console.log(chalk.cyan("║") + "  ├──────────────────┼────────────┤" + " ".repeat(26) + chalk.cyan("║"));
    console.log(chalk.cyan("║") + `  │ Total blocks     │ ${totalBlocks.toString().padEnd(10)} │${" ".repeat(36)}` + chalk.cyan("║"));
    console.log(chalk.cyan("║") + `  │ Valid            │ ${allValid ? chalk.green("✓ Tak") : chalk.red("✗ Nie")}${" ".repeat(39)}` + chalk.cyan("║"));
    console.log(chalk.cyan("║") + `  │ Timestamp issues │ ${timestampIssues.toString().padEnd(10)} │${" ".repeat(36)}` + chalk.cyan("║"));
    console.log(chalk.cyan("║") + "  └──────────────────┴────────────┘" + " ".repeat(26) + chalk.cyan("║"));
    console.log(chalk.cyan("╠══════════════════════════════════════════════════════════════╣"));
    // Final status
    if (allValid && timestampIssues === 0) {
        console.log(chalk.cyan("║  ") + chalk.green("✓ Chain jest OK! Wszystko działa. 😄") + " ".repeat(22) + chalk.cyan("║"));
    }
    else {
        console.log(chalk.cyan("║  ") + chalk.yellow("⚠ Chain ma problemy - sprawdź logi") + " ".repeat(23) + chalk.cyan("║"));
    }
    console.log(chalk.cyan("╚══════════════════════════════════════════════════════════════╝"));
    console.log();
}
//# sourceMappingURL=status.js.map