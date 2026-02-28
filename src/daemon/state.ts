import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DAEMON_STATE_PATH } from "../config/defaults.js";

export interface ShellFileState {
  size: number;
  updatedAt: string;
}

export interface GitRepoState {
  head?: string;
  updatedAt: string;
}

export interface DaemonState {
  shell?: {
    files: Record<string, ShellFileState>;
  };
  git?: {
    repos: Record<string, GitRepoState>;
  };
}

function createEmptyState(): DaemonState {
  return {
    shell: { files: {} },
    git: { repos: {} },
  };
}

export class DaemonStateStore {
  private state: DaemonState;

  constructor(private readonly path: string = DAEMON_STATE_PATH) {
    this.state = this.loadFromDisk();
    this.ensureSections();
  }

  getState(): DaemonState {
    return this.state;
  }

  update(mutator: (state: DaemonState) => void): void {
    mutator(this.state);
    this.persist();
  }

  private loadFromDisk(): DaemonState {
    if (!existsSync(this.path)) {
      return createEmptyState();
    }

    try {
      const raw = readFileSync(this.path, "utf-8");
      const parsed = JSON.parse(raw);
      const next: DaemonState = {
        shell: { files: parsed.shell?.files ?? {} },
        git: { repos: parsed.git?.repos ?? {} },
      };
      return next;
    } catch {
      return createEmptyState();
    }
  }

  private persist(): void {
    this.ensureSections();
    mkdirSync(dirname(this.path), { recursive: true, mode: 0o700 });
    writeFileSync(this.path, JSON.stringify(this.state, null, 2), { encoding: "utf-8" });
  }

  private ensureSections(): void {
    if (!this.state.shell) {
      this.state.shell = { files: {} };
    } else if (!this.state.shell.files) {
      this.state.shell.files = {};
    }

    if (!this.state.git) {
      this.state.git = { repos: {} };
    } else if (!this.state.git.repos) {
      this.state.git.repos = {};
    }
  }
}
