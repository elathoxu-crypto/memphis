import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { Store } from "../../memory/store.js";
import { DaemonStateStore } from "../state.js";
import { Collector } from "../types.js";

const INTERESTING_COMMIT = /^(feat|fix|refactor)/i;
const DEFAULT_TAGS = ["daemon", "git", "inferred-decision"];

interface GitRepoConfig {
  path: string;
  label: string;
}

interface GitCollectorOptions {
  chain?: string;
  tags?: string[];
  repos?: GitRepoConfig[];
}

interface GitCommit {
  hash: string;
  timestamp: number;
  message: string;
}

export class GitCollector implements Collector {
  public readonly name = "git";

  constructor(
    private readonly store: Store,
    private readonly state: DaemonStateStore,
    private readonly options: GitCollectorOptions
  ) {}

  async collect(): Promise<void> {
    const repos = this.options.repos ?? [];
    for (const repo of repos) {
      await this.inspectRepo(repo);
    }
  }

  private async inspectRepo(repo: GitRepoConfig): Promise<void> {
    if (!existsSync(repo.path) || !existsSync(join(repo.path, ".git"))) {
      return;
    }

    const head = this.runGit(repo.path, ["rev-parse", "HEAD"]);
    if (!head) return;

    const state = this.state.getState();
    const previous = state.git?.repos?.[repo.path]?.head;
    if (previous === head) {
      return;
    }

    const commits = this.loadCommits(repo.path, previous, head);
    const interesting = commits.filter(commit => INTERESTING_COMMIT.test(commit.message));
    this.updateHead(repo.path, head);

    if (interesting.length === 0) {
      return;
    }

    const summary = interesting
      .slice(-5)
      .map(c => `${c.hash.slice(0, 7)} ${c.message}`)
      .join(" | ");

    const content = `Git commits detected in ${repo.label}: ${summary}`;
    const tags = Array.from(new Set([...(this.options.tags ?? DEFAULT_TAGS), repo.label]));

    await this.store.appendBlock(this.options.chain ?? "journal", {
      type: "journal",
      content,
      tags,
      agent: "daemon",
    });
  }

  private loadCommits(repoPath: string, previous: string | undefined, head: string): GitCommit[] {
    let raw = "";
    if (previous) {
      raw = this.runGit(repoPath, ["log", `${previous}..${head}`, "--pretty=format:%H::%ct::%s", "-n", "20"]) ?? "";
    } else {
      raw = this.runGit(repoPath, ["log", "-1", "--pretty=format:%H::%ct::%s", head]) ?? "";
    }

    return raw
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [hash, ts, ...rest] = line.split("::");
        return {
          hash,
          timestamp: Number.parseInt(ts ?? "0", 10),
          message: rest.join("::").trim(),
        };
      })
      .filter(commit => !!commit.hash);
  }

  private updateHead(repoPath: string, head: string): void {
    this.state.update(state => {
      if (!state.git) {
        state.git = { repos: {} };
      }
      if (!state.git.repos) {
        state.git.repos = {};
      }
      state.git.repos[repoPath] = {
        head,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  private runGit(repoPath: string, args: string[]): string | null {
    const result = spawnSync("git", ["-C", repoPath, ...args], {
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.status !== 0) {
      return null;
    }
    return result.stdout.trim();
  }
}
