import { Store } from "../../memory/store.js";
import { buildStatusReport } from "../../core/status.js";
import { loadConfig } from "../../config/loader.js";
import chalk from "chalk";
export async function statusCommand(options = {}) {
    const config = loadConfig();
    const store = new Store(config.memory.path);
    const report = buildStatusReport(store, config);
    // JSON output
    if (options.json) {
        console.log(JSON.stringify(report, null, 2));
        process.exit(0);
    }
    // Human output
    console.log();
    console.log(chalk.bold("  Memphis 🧠"));
    console.log(chalk.dim("  Local-first AI brain with persistent memory"));
    console.log();
    // Chains
    console.log(chalk.bold("  Chains:"));
    if (report.chains.length === 0) {
        console.log(chalk.gray("    No chains yet"));
    }
    else {
        for (const chain of report.chains) {
            let status;
            switch (chain.health) {
                case "ok":
                    status = chalk.green(`✓ ${chain.blocks} blocks`);
                    break;
                case "broken":
                    status = chalk.red(`✗ broken at block ${chain.broken_at}`);
                    break;
                case "empty":
                    status = chalk.gray("· empty");
                    break;
            }
            console.log(`    ${chalk.cyan("⛓")} ${chain.name} — ${status}`);
        }
    }
    console.log();
    // Providers
    console.log(chalk.bold("  Providers:"));
    if (report.providers.length === 0) {
        console.log(chalk.gray("    No providers configured"));
    }
    else {
        for (const p of report.providers) {
            let status;
            switch (p.health) {
                case "ready":
                    status = chalk.green("✓ ready");
                    break;
                case "no_key":
                    status = chalk.yellow("⚠ no key");
                    break;
                case "offline":
                    status = chalk.red("✗ offline");
                    break;
                case "error":
                    status = chalk.red(`✗ ${p.detail || "error"}`);
                    break;
            }
            console.log(`    ${p.name} — ${p.model || "?"} — ${p.role || "?"} — ${status}`);
        }
    }
    // Vault
    console.log();
    console.log(chalk.bold("  Vault:"));
    let vaultStatus;
    switch (report.vault.health) {
        case "ok":
            vaultStatus = chalk.green(`✓ ${report.vault.blocks} keys`);
            break;
        case "not_initialized":
            vaultStatus = chalk.yellow("✗ not initialized");
            break;
        case "broken":
            vaultStatus = chalk.red("✗ broken");
            break;
    }
    console.log(`    ${vaultStatus}`);
    // Recent
    console.log();
    console.log(chalk.bold("  Recent:"));
    if (report.recent.length === 0) {
        console.log(chalk.gray("    No recent blocks"));
    }
    else {
        for (const r of report.recent) {
            const time = new Date(r.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
            console.log(`    ${chalk.gray(time)} ${chalk.cyan(r.chain)} ${chalk.dim(r.type)} ${r.content.substring(0, 40)}...`);
        }
    }
    // Summary
    console.log();
    console.log(chalk.bold("  Status:") + (report.ok ? chalk.green(" OK") : chalk.red(" ISSUES")));
    console.log();
}
//# sourceMappingURL=status.js.map