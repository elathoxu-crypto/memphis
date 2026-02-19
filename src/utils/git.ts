/**
 * Memphis – Git Auto-Commit
 *
 * Inicjalizuje repozytorium git w basePath jeśli nie istnieje,
 * a po każdym bloku wykonuje `git add . && git commit`.
 *
 * Włączane przez config: memory.auto_git = true
 * Opcjonalny push:       memory.auto_git_push = true
 */
import { execSync, spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Block } from "../memory/chain.js";

export interface GitCommitResult {
  success: boolean;
  sha?: string;
  message?: string;
  skipped?: boolean;
  error?: string;
}

const GITIGNORE_CONTENT = `# Memphis – ignorowane pliki
*.log
.DS_Store
Thumbs.db
`;

/**
 * Sprawdza czy git jest dostępny w PATH
 */
export function isGitAvailable(): boolean {
  try {
    const result = spawnSync("git", ["--version"], { timeout: 3000 });
    return result.status === 0;
  } catch {
    return false;
  }
}

/**
 * Inicjalizuje repo git w katalogu basePath jeśli jeszcze nie ma.
 * Ustawia podstawową konfigurację (user.name, user.email) jeśli brak.
 */
export function ensureGitRepo(basePath: string): boolean {
  if (!isGitAvailable()) return false;

  const gitDir = join(basePath, ".git");
  if (!existsSync(gitDir)) {
    const init = spawnSync("git", ["init", basePath], { timeout: 5000 });
    if (init.status !== 0) return false;

    // .gitignore
    const gitignorePath = join(basePath, ".gitignore");
    if (!existsSync(gitignorePath)) {
      writeFileSync(gitignorePath, GITIGNORE_CONTENT, "utf-8");
    }

    // Domyślna konfiguracja jeśli brak globalnej
    const hasName = spawnSync("git", ["config", "user.name"], { cwd: basePath, timeout: 2000 });
    if (hasName.status !== 0 || !hasName.stdout?.toString().trim()) {
      spawnSync("git", ["config", "user.name", "Memphis"], { cwd: basePath });
      spawnSync("git", ["config", "user.email", "memphis@local"], { cwd: basePath });
    }
  }
  return true;
}

/**
 * Główna funkcja – commituje nowo dodany blok.
 * Wywołuj po każdym Store.addBlock().
 */
export function commitBlock(
  basePath: string,
  block: Block,
  options: { push?: boolean; remote?: string } = {}
): GitCommitResult {
  if (!isGitAvailable()) {
    return { success: false, skipped: true, error: "git not found in PATH" };
  }

  if (!ensureGitRepo(basePath)) {
    return { success: false, error: "Failed to initialize git repo" };
  }

  try {
    // Stage everything (nowy plik bloku)
    const add = spawnSync("git", ["add", "."], { cwd: basePath, timeout: 5000 });
    if (add.status !== 0) {
      return { success: false, error: `git add failed: ${add.stderr?.toString()}` };
    }

    // Sprawdź czy jest coś do commitowania
    const status = spawnSync("git", ["status", "--porcelain"], { cwd: basePath, timeout: 3000 });
    if (!status.stdout?.toString().trim()) {
      return { success: true, skipped: true, message: "nothing to commit" };
    }

    // Commit message: typ bloku + chain + pierwsze 60 znaków contentu
    const preview = block.data.content.replace(/\n/g, " ").slice(0, 60);
    const commitMsg = `[${block.chain}] ${block.data.type} #${block.index}: ${preview}`;

    const commit = spawnSync("git", ["commit", "-m", commitMsg], {
      cwd: basePath,
      timeout: 10000,
    });

    if (commit.status !== 0) {
      const stderr = commit.stderr?.toString() ?? "";
      // "nothing to commit" nie jest błędem
      if (stderr.includes("nothing to commit")) {
        return { success: true, skipped: true };
      }
      return { success: false, error: `git commit failed: ${stderr}` };
    }

    // Pobierz SHA nowego commita
    const shaResult = spawnSync("git", ["rev-parse", "--short", "HEAD"], {
      cwd: basePath,
      timeout: 3000,
    });
    const sha = shaResult.stdout?.toString().trim();

    // Opcjonalny push
    if (options.push) {
      const remote = options.remote ?? "origin";
      const pushResult = spawnSync("git", ["push", remote], { cwd: basePath, timeout: 30000 });
      if (pushResult.status !== 0) {
        // Push failure nie jest krytyczny – commit już istnieje lokalnie
        return {
          success: true,
          sha,
          message: commitMsg,
          error: `push failed (commit saved locally): ${pushResult.stderr?.toString()}`,
        };
      }
    }

    return { success: true, sha, message: commitMsg };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

/**
 * Zwraca ostatnie N commitów jako czytelne stringi
 */
export function getRecentCommits(basePath: string, n = 10): string[] {
  if (!isGitAvailable() || !existsSync(join(basePath, ".git"))) return [];
  try {
    const result = spawnSync(
      "git",
      ["log", `--max-count=${n}`, "--oneline", "--no-decorate"],
      { cwd: basePath, timeout: 5000 }
    );
    if (result.status !== 0) return [];
    return result.stdout
      ?.toString()
      .split("\n")
      .filter(Boolean) ?? [];
  } catch {
    return [];
  }
}

/**
 * Czy repo ma uncommitted changes?
 */
export function hasUncommittedChanges(basePath: string): boolean {
  if (!isGitAvailable() || !existsSync(join(basePath, ".git"))) return false;
  try {
    const result = spawnSync("git", ["status", "--porcelain"], { cwd: basePath, timeout: 3000 });
    return !!result.stdout?.toString().trim();
  } catch {
    return false;
  }
}
