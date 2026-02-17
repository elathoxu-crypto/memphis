#!/usr/bin/env node
import { Command } from "commander";
import { journalCommand } from "./commands/journal.js";
import { askCommand } from "./commands/ask.js";
import { recallCommand } from "./commands/recall.js";
import { statusCommand } from "./commands/status.js";
import { initCommand } from "./commands/init.js";
import { vaultCommand } from "./commands/vault.js";

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

program.parse();
