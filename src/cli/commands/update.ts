import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";

export interface UpdateOptions {
  json?: boolean;
  yes?: boolean;
  check?: boolean;
}

interface UpdateStatus {
  projectRoot: string;
  packageName: string;
  localVersion: string;
  npmLatest: string | null;
  gitBranch: string | null;
  gitCommit: string | null;
  gitDirty: boolean;
}

function run(command: string, cwd: string): string {
  return execSync(command, { cwd, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }).trim();
}

function safeRun(command: string, cwd: string): string | null {
  try {
    return run(command, cwd);
  } catch {
    return null;
  }
}

function resolveProjectRoot(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return resolve(dirname(currentFile), "../../..");
}

function loadPackageJson(root: string): { name: string; version: string } {
  const pkgPath = resolve(root, "package.json");
  if (!existsSync(pkgPath)) {
    throw new Error(`package.json not found at ${pkgPath}`);
  }
  const raw = JSON.parse(readFileSync(pkgPath, "utf8"));
  return {
    name: raw.name || "memphis",
    version: raw.version || "0.0.0",
  };
}

function collectStatus(): UpdateStatus {
  const projectRoot = resolveProjectRoot();
  const pkg = loadPackageJson(projectRoot);

  const npmLatest = safeRun(`npm view ${pkg.name} version`, projectRoot);
  const gitBranch = safeRun("git rev-parse --abbrev-ref HEAD", projectRoot);
  const gitCommit = safeRun("git rev-parse --short HEAD", projectRoot);
  const gitDirty = (safeRun("git status --porcelain", projectRoot) || "").length > 0;

  return {
    projectRoot,
    packageName: pkg.name,
    localVersion: pkg.version,
    npmLatest,
    gitBranch,
    gitCommit,
    gitDirty,
  };
}

export async function updateStatusCommand(options: UpdateOptions = {}) {
  const status = collectStatus();

  if (options.json) {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  console.log(chalk.bold("📦 Memphis Update Status\n"));
  console.log(`Project: ${status.packageName}`);
  console.log(`Root: ${status.projectRoot}`);
  console.log(`Version: ${status.localVersion}`);
  console.log(`npm latest: ${status.npmLatest || "unknown"}`);
  console.log(`Git: ${status.gitBranch || "n/a"} @ ${status.gitCommit || "n/a"}`);
  console.log(`Working tree: ${status.gitDirty ? chalk.yellow("dirty") : chalk.green("clean")}`);

  if (status.npmLatest && status.npmLatest !== status.localVersion) {
    console.log(chalk.yellow(`\nUpdate available: ${status.localVersion} → ${status.npmLatest}`));
  } else if (status.npmLatest) {
    console.log(chalk.green("\nYou are on the latest published version."));
  }
}

export async function updateRunCommand(options: UpdateOptions = {}) {
  const status = collectStatus();

  if (status.gitDirty && !options.yes) {
    console.log(chalk.red("❌ Working tree is dirty. Commit/stash first, or run with --yes."));
    process.exit(1);
  }

  console.log(chalk.bold("🚀 Running Memphis update pipeline...\n"));
  console.log(chalk.gray(`cwd: ${status.projectRoot}`));

  const steps = [
    "git fetch --all --tags --prune",
    "git pull --rebase --autostash",
    "npm install",
    "npm run build",
  ];

  for (const step of steps) {
    console.log(chalk.cyan(`→ ${step}`));
    execSync(step, { cwd: status.projectRoot, stdio: "inherit" });
  }

  console.log(chalk.green("\n✅ Memphis updated and rebuilt."));
}
