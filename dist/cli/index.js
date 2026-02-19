#!/usr/bin/env node
import { Command } from "commander";
import { journalCommand } from "./commands/journal.js";
import { askCommand } from "./commands/ask.js";
import { recallCommand } from "./commands/recall.js";
import { statusCommand } from "./commands/status.js";
import { initCommand } from "./commands/init.js";
import { vaultCommand } from "./commands/vault.js";
import { agentCommand } from "./commands/agent.js";
import { decideCommand } from "./commands/decide.js";
import { showCommand } from "./commands/show.js";
import { reviseCommand } from "./commands/revise.js";
import { runOpenClawCommands } from "../bridges/openclaw.js";
import { MemphisTUI } from "../tui/index.js";
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
    .command("decide")
    .description("Record a decision (conscious or inferred)")
    .argument("<title>", "Decision title (what did you decide?)")
    .argument("<chosen>", "What did you choose?")
    .option("-o, --options <options>", "Options considered (pipe-separated, e.g. A|B|C)", "")
    .option("-r, --reasoning <reasoning>", "Why did you choose this?", "")
    .option("-s, --scope <scope>", "Impact scope: personal|project|life", "project")
    .option("-m, --mode <mode>", "Mode: conscious|inferred", "conscious")
    .option("-c, --confidence <n>", "Confidence 0-1", "1")
    .option("-l, --links <links>", "Related decision IDs (pipe-separated)", "")
    .option("-e, --evidence <evidence>", "Evidence refs for inferred (pipe-separated)", "")
    .action((title, chosen, opts) => {
    decideCommand(title, {
        options: opts.options,
        chosen,
        why: opts.reasoning,
        scope: opts.scope,
        mode: opts.mode,
        confidence: opts.confidence,
        links: opts.links,
        evidenceRefs: opts.evidence,
    });
});
program
    .command("show")
    .description("Show a decision by ID")
    .argument("<kind>", "decision")
    .argument("<id>", "Decision ID or record ID")
    .action((kind, id) => {
    showCommand(kind, id);
});
program
    .command("revise")
    .description("Revise a decision (creates new block)")
    .argument("<decisionId>", "Decision ID to revise")
    .option("-r, --reasoning <reasoning>", "New reasoning")
    .action((decisionId, opts) => {
    reviseCommand(decisionId, { reason: opts.reasoning || "" });
});
program
    .command("vault")
    .description("Manage encrypted secrets (SSI Vault)")
    .argument("<action>", "init | add | list | get | delete")
    .argument("[key]", "Secret key name")
    .argument("[value]", "Secret value")
    .option("--password-env <var>", "Read vault password from environment variable (recommended for scripts)")
    .option("--password-stdin", "Read vault password from stdin (recommended for scripts)")
    .action(async (action, key, value, opts) => {
    await vaultCommand({
        action,
        key,
        value,
        passwordEnv: opts.passwordEnv,
        passwordStdin: opts.passwordStdin,
    });
});
program
    .command("agent")
    .description("Manage agents (autosave, openclaw)")
    .argument("<action>", "start | stop | status | openclaw | collab")
    .argument("[subaction...]", "Optional subcommand and arguments")
    .option("-i, --interval <time>", "Interval for autosave (e.g., 5m)")
    .action(async (action, subactionArgs, opts) => {
    if (action === "openclaw" || action === "collab") {
        // subactionArgs is now an array of strings
        runOpenClawCommands(subactionArgs || []);
    }
    else {
        await agentCommand(action, { interval: opts.interval });
    }
});
program
    .command("tui")
    .description("Launch the terminal UI")
    .option("-s, --screen <screen>", "Open specific screen (dashboard, journal, vault, recall, ask, openclaw, settings)")
    .action((opts) => {
    const tui = new MemphisTUI();
    // If screen specified, navigate to it after a brief delay
    if (opts.screen) {
        setTimeout(() => {
            const screenMap = {
                dashboard: 1,
                journal: 2,
                vault: 3,
                recall: 4,
                ask: 5,
                openclaw: 6,
                settings: 7,
            };
            const screenNum = screenMap[opts.screen.toLowerCase()];
            if (screenNum) {
                // Access the navigateToMenu method via the instance
                tui.navigateToMenu(screenNum);
            }
        }, 500);
    }
    tui.run();
});
program.parse();
//# sourceMappingURL=index.js.map