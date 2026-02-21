import chalk from "chalk";
import { Store } from "../../memory/store.js";
import { revise, type ReviseOptions, type QuarantineResult } from "../../memory/revise.js";
import { loadConfig } from "../../config/loader.js";

export interface RepairCliOptions {
  chain?: string;
  dryRun?: boolean;
  json?: boolean;
}

export async function repairCommand(options: RepairCliOptions = {}) {
  const config = loadConfig();
  const store = new Store(config.memory.path);
  
  const reviseOptions: ReviseOptions = {
    chain: options.chain,
    dryRun: options.dryRun,
    json: options.json,
  };
  
  const results = revise(store, reviseOptions);
  
  // JSON output
  if (options.json) {
    console.log(JSON.stringify({
      dry_run: !!options.dryRun,
      chains: results.map(r => ({
        name: r.chain,
        status: r.status,
        head: r.head,
        quarantined: r.quarantined,
        errors: r.errors,
      })),
    }, null, 2));
    
    const hasErrors = results.some(r => r.status === "broken");
    process.exit(hasErrors ? 2 : 0);
  }
  
  // Human output
  console.log();
  console.log(chalk.bold("🔧 Memphis Chain Repair\n"));
  
  if (options.dryRun) {
    console.log(chalk.yellow("  [DRY RUN] No files will be modified\n"));
  }
  
  let hasIssues = false;
  
  for (const r of results) {
    switch (r.status) {
      case "ok":
        console.log(chalk.green(`  ✓ ${r.chain} OK (head=${r.head})`));
        break;
      case "fixed":
        console.log(chalk.yellow(`  ⚠ ${r.chain} FIXED (head=${r.head}, quarantined=${r.quarantined})`));
        hasIssues = true;
        break;
      case "broken":
        console.log(chalk.red(`  ✗ ${r.chain} BROKEN: ${r.errors.join("; ")}`));
        hasIssues = true;
        break;
    }
    
    // Show errors 
    if (r.errors.length > 0 && !options.json) {
      r.errors.forEach(e => console.log(chalk.gray(`    - ${e}`)));
    }
  }
  
  console.log();
  
  if (options.dryRun) {
    console.log(chalk.dim("  Run without --dry-run to apply fixes"));
    process.exit(0);
  }
  
  if (hasIssues) {
    console.log(chalk.bold("\n⚠️  Run: memphis verify"));
    process.exit(1);
  } else {
    console.log(chalk.green("✅ All chains healthy"));
    process.exit(0);
  }
}
