#!/usr/bin/env node
import { Command } from "commander";
import { journalCommand } from "./commands/journal.js";
import { askCommand } from "./commands/ask.js";
import { recallCommand } from "./commands/recall.js";
import { statusCommand } from "./commands/status.js";
import { initCommand } from "./commands/init.js";
import { vaultCommand } from "./commands/vault.js";
import { agentCommand } from "./commands/agent.js";
import { runOpenClawCommands } from "../bridges/openclaw.js";
const program = new Command();
program
    .name("memphis")
    .description("Local-first AI brain with persistent memory")
    .version("0.1.0");
program
    .command("init")
    .description("Initialize Memphis in ~/.memphis")
    .action(initCommand);
program
    .command("journal <message>")
    .description("Add a journal entry to memory")
    .option("-t, --tags <tags>", "Comma-separated tags")
    .action(journalCommand);
program
    .command("ask <question>")
    .description("Ask Memphis (searches memory, later: LLM)")
    .action(askCommand);
program
    .command("recall <keyword>")
    .description("Search memory by keyword")
    .option("-c, --chain <chain>", "Search specific chain")
    .option("-l, --limit <n>", "Max results")
    .option("--tag <tag>", "Filter by tag")
    .action(recallCommand);
program
    .command("status")
    .description("Show Memphis status")
    .action(statusCommand);
program
    .command("vault")
    .description("Manage encrypted secrets (SSI Vault)")
    .argument("<action>", "init | add | list | get | delete")
    .argument("[key]", "Secret key name")
    .argument("[value]", "Secret value")
    .option("-p, --password <password>", "Master password for encryption")
    .action(async (action, key, value, opts) => {
    await vaultCommand({
        action,
        key,
        value,
        password: opts.password,
    });
});
program
    .command("agent")
    .description("Manage agents (autosave, openclaw)")
    .argument("<action>", "start | stop | status | openclaw | collab")
    .argument("[subaction]", "status, list, invite, negotiate", "")
    .argument("[value]", "Value for subaction", "")
    .option("-i, --interval <time>", "Interval for autosave (e.g., 5m)")
    .action(async (action, subaction, value, opts) => {
    if (action === "openclaw" || action === "collab") {
        runOpenClawCommands([subaction, value].filter(Boolean));
    }
    else {
        await agentCommand(action, { interval: opts.interval });
    }
});
program.parse();
//# sourceMappingURL=index.js.map