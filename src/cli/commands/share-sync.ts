import { Command } from "commander";
import chalk from "chalk";
import { promises as fs } from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createWorkspaceStore } from "../utils/workspace-store.js";
import { MEMPHIS_HOME, CHAINS_PATH } from "../../config/defaults.js";

interface ShareSyncOptions {
  push?: boolean;
  pull?: boolean;
  remote?: string;
  user?: string;
  status?: boolean;
  force?: boolean;
}

interface SyncStatus {
  localBlocks: number;
  remoteBlocks: number;
  lastSync: string | null;
  remoteHost: string;
  connectionStatus: "ok" | "error" | "unknown";
}

export function registerShareSyncCommand(program: Command): void {
  program
    .command("share-sync")
    .description("Synchronize share chain with remote Memphis agent")
    .option("--push", "Push local share blocks to remote")
    .option("--pull", "Pull remote share blocks to local")
    .option("--remote <host>", "Remote Memphis host (IP or hostname)", "10.0.0.80")
    .option("--user <user>", "Remote user", "memphis")
    .option("--status", "Show sync status only")
    .option("--force", "Force sync even if conflicts detected")
    .action(async (options: ShareSyncOptions) => {
      await handleShareSync(options);
    });
}

async function handleShareSync(options: ShareSyncOptions): Promise<void> {
  const store = await createWorkspaceStore();
  
  // Check if 'memphis' SSH host exists in config
  let useSSHConfig = false;
  if (!options.remote && !options.user) {
    try {
      const sshConfig = await fs.readFile(path.join(process.env.HOME || "", ".ssh", "config"), "utf8");
      // Check for "Host memphis" or "Host memphis-test"
      useSSHConfig = /^Host\s+memphis(\s|$)/m.test(sshConfig);
      if (useSSHConfig) {
        console.log(chalk.gray("\n  ℹ Using SSH config: memphis\n"));
      }
    } catch {}
  }

  const remoteHost = options.remote || "10.0.0.80";
  const remoteUser = options.user || "memphis";

  console.log(chalk.bold.cyan("\n🔄 Memphis Share Sync"));
  console.log(chalk.gray("━".repeat(50)));

  try {
    // Show status only
    if (options.status) {
      await showSyncStatus(store, remoteHost, remoteUser, useSSHConfig);
      return;
    }

    // Default: show status if no action specified
    if (!options.push && !options.pull) {
      await showSyncStatus(store, remoteHost, remoteUser, useSSHConfig);
      console.log(chalk.gray("\n💡 Use --push or --pull to sync"));
      return;
    }

    // Push local blocks to remote
    if (options.push) {
      await pushToRemote(store, remoteHost, remoteUser, useSSHConfig, options.force);
    }

    // Pull remote blocks to local
    if (options.pull) {
      await pullFromRemote(store, remoteHost, remoteUser, useSSHConfig, options.force);
    }

  } catch (error: any) {
    console.error(chalk.red("\n✗ Sync failed:"), error.message);
    console.error(chalk.gray("\nTroubleshooting:"));
    if (useSSHConfig) {
      console.error(chalk.white("  1. Check SSH config: cat ~/.ssh/config"));
      console.error(chalk.white("  2. Test connection: ssh memphis 'node ~/memphis/dist/cli/index.js status'"));
    } else {
      console.error(chalk.white("  1. Check SSH key: ssh-copy-id " + remoteUser + "@" + remoteHost));
      console.error(chalk.white("  2. Test connection: ssh " + remoteUser + "@" + remoteHost + " 'memphis status'"));
    }
    console.error(chalk.white("  3. Verify Memphis installed on remote"));
    process.exit(1);
  }
}

async function showSyncStatus(
  store: any,
  remoteHost: string,
  remoteUser: string,
  useSSHConfig: boolean
): Promise<void> {
  console.log(chalk.bold.white("\n📊 Sync Status\n"));

  // Get local share blocks count
  const localBlocks = await countLocalShareBlocks();
  console.log(chalk.white("  Local share blocks:"), chalk.green(localBlocks.toString()));

  // Try to get remote status
  let remoteBlocks = 0;
  let connectionStatus: "ok" | "error" | "unknown" = "unknown";
  let lastSync: string | null = null;

  const sshTarget = useSSHConfig ? "memphis" : `${remoteUser}@${remoteHost}`;
  const memphisCmd = useSSHConfig ? "node ~/memphis/dist/cli/index.js" : "memphis";

  try {
    const remoteStatus = execSync(
      `ssh -o ConnectTimeout=3 -o BatchMode=yes ${sshTarget} '${memphisCmd} status 2>/dev/null | grep -A 1 "share" | grep "✓" | grep -oE "[0-9]+" | head -1'`,
      { encoding: "utf8", timeout: 5000 }
    ).trim();
    
    remoteBlocks = parseInt(remoteStatus) || 0;
    connectionStatus = "ok";
  } catch (error) {
    connectionStatus = "error";
    console.log(chalk.red("  Remote connection:"), chalk.red("✗ Failed"));
    console.log(chalk.gray("  Issue: SSH key not configured or Memphis not installed"));
  }

  if (connectionStatus === "ok") {
    console.log(chalk.white("  Remote share blocks:"), chalk.green(remoteBlocks.toString()));
    console.log(chalk.white("  Remote connection:"), chalk.green("✓ Connected"));
    
    // Calculate sync status
    const diff = localBlocks - remoteBlocks;
    if (diff > 0) {
      console.log(chalk.yellow("\n  📤 Local ahead by:"), chalk.yellow(`${diff} blocks`));
      console.log(chalk.gray("  Suggestion: Run with --push"));
    } else if (diff < 0) {
      console.log(chalk.cyan("\n  📥 Remote ahead by:"), chalk.cyan(`${Math.abs(diff)} blocks`));
      console.log(chalk.gray("  Suggestion: Run with --pull"));
    } else {
      console.log(chalk.green("\n  ✓ In sync"));
    }
  }

  // Show last sync time (if tracked)
  try {
    const lastSyncData = await fs.readFile(
      path.join(MEMPHIS_HOME, "share-sync.json"),
      "utf8"
    );
    const syncInfo = JSON.parse(lastSyncData);
    lastSync = syncInfo.lastSync;
    console.log(chalk.white("\n  Last sync:"), chalk.gray(lastSync || "Never"));
  } catch {
    console.log(chalk.white("\n  Last sync:"), chalk.gray("Never"));
  }

  console.log(chalk.gray("\n  Remote:"), chalk.white(useSSHConfig ? "memphis (SSH config)" : `${remoteUser}@${remoteHost}`));
}

async function pushToRemote(
  store: any,
  remoteHost: string,
  remoteUser: string,
  useSSHConfig: boolean,
  force?: boolean
): Promise<void> {
  console.log(chalk.bold.white("\n📤 Pushing to remote...\n"));

  const sharePath = path.join(CHAINS_PATH, "share");
  const sshTarget = useSSHConfig ? "memphis" : `${remoteUser}@${remoteHost}`;
  
  // Check if share chain exists
  try {
    await fs.access(sharePath);
  } catch {
    console.log(chalk.yellow("  ⚠ No local share blocks to push"));
    return;
  }

  // Read local share blocks
  const files = await fs.readdir(sharePath);
  const jsonFiles = files.filter(f => f.endsWith(".json"));
  
  if (jsonFiles.length === 0) {
    console.log(chalk.yellow("  ⚠ No local share blocks to push"));
    return;
  }

  console.log(chalk.white("  Blocks to push:"), chalk.green(jsonFiles.length.toString()));

  // Create remote share directory if needed
  console.log(chalk.gray("  Ensuring remote directory..."));
  execSync(
    `ssh ${sshTarget} 'mkdir -p ~/.memphis/chains/share'`,
    { stdio: "inherit" }
  );

  // Push share blocks
  console.log(chalk.gray("  Syncing blocks..."));
  execSync(
    `rsync -av --progress ${sharePath}/ ${sshTarget}:~/.memphis/chains/share/`,
    { stdio: "inherit" }
  );

  // Record sync
  await recordSync("push", jsonFiles.length);

  console.log(chalk.green("\n  ✓ Push complete!"));
  console.log(chalk.white("  Blocks pushed:"), chalk.green(jsonFiles.length.toString()));
}

async function pullFromRemote(
  store: any,
  remoteHost: string,
  remoteUser: string,
  useSSHConfig: boolean,
  force?: boolean
): Promise<void> {
  console.log(chalk.bold.white("\n📥 Pulling from remote...\n"));

  const sharePath = path.join(CHAINS_PATH, "share");
  const sshTarget = useSSHConfig ? "memphis" : `${remoteUser}@${remoteHost}`;

  // Ensure local share directory exists
  await fs.mkdir(sharePath, { recursive: true });

  // Check remote share blocks count
  let remoteBlockCount = 0;
  try {
    const count = execSync(
      `ssh ${sshTarget} 'ls ~/.memphis/chains/share/*.json 2>/dev/null | wc -l'`,
      { encoding: "utf8" }
    ).trim();
    remoteBlockCount = parseInt(count) || 0;
  } catch {
    console.log(chalk.red("  ✗ Cannot access remote share chain"));
    return;
  }

  if (remoteBlockCount === 0) {
    console.log(chalk.yellow("  ⚠ No remote share blocks to pull"));
    return;
  }

  console.log(chalk.white("  Blocks to pull:"), chalk.green(remoteBlockCount.toString()));

  // Pull share blocks
  console.log(chalk.gray("  Syncing blocks..."));
  execSync(
    `rsync -av --progress ${sshTarget}:~/.memphis/chains/share/ ${sharePath}/`,
    { stdio: "inherit" }
  );

  // Record sync
  await recordSync("pull", remoteBlockCount);

  console.log(chalk.green("\n  ✓ Pull complete!"));
  console.log(chalk.white("  Blocks pulled:"), chalk.green(remoteBlockCount.toString()));
}

async function countLocalShareBlocks(): Promise<number> {
  const sharePath = path.join(CHAINS_PATH, "share");
  try {
    const files = await fs.readdir(sharePath);
    return files.filter(f => f.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

async function recordSync(direction: "push" | "pull", blocks: number): Promise<void> {
  const syncInfo = {
    lastSync: new Date().toISOString(),
    direction,
    blocks,
    remote: "10.0.0.80"
  };
  
  await fs.writeFile(
    path.join(MEMPHIS_HOME, "share-sync.json"),
    JSON.stringify(syncInfo, null, 2),
    "utf8"
  );
}
