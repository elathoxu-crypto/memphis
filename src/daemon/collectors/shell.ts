import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Store } from "../../memory/store.js";
import { DaemonStateStore } from "../state.js";
import { Collector } from "../types.js";

interface ShellCollectorOptions {
  chain?: string;
  historyPaths?: string[];
  tags?: string[];
}

interface ShellEvent {
  kind: string;
  description: string;
  tags: string[];
}

const DEFAULT_HISTORY_FILES = [
  join(homedir(), ".bash_history"),
  join(homedir(), ".zsh_history"),
];

const DEFAULT_TAGS = ["daemon", "shell"];

export class ShellCollector implements Collector {
  public readonly name = "shell";

  constructor(
    private readonly store: Store,
    private readonly state: DaemonStateStore,
    private readonly options: ShellCollectorOptions = {}
  ) {}

  async collect(): Promise<void> {
    const path = this.resolveHistoryFile();
    if (!path) return;

    let data = "";
    try {
      data = readFileSync(path, "utf-8");
    } catch {
      return;
    }
    const fileState = this.state.getState().shell?.files?.[path];
    const lastSize = fileState?.size ?? 0;
    const start = lastSize <= data.length ? lastSize : 0;
    const newChunk = data.slice(start);

    this.updateFileState(path, data.length);
    if (!newChunk.trim()) return;

    const lines = newChunk
      .split(/\r?\n/)
      .map(line => this.normalizeLine(line))
      .filter(Boolean);

    const events = lines
      .map(line => this.detectEvent(line))
      .filter((evt): evt is ShellEvent => !!evt);

    if (events.length === 0) {
      return;
    }

    const uniqueTags = new Set<string>(this.options.tags ?? DEFAULT_TAGS);
    events.forEach(evt => evt.tags.forEach(tag => uniqueTags.add(tag)));

    const summary = events
      .slice(-5)
      .map(evt => `[${evt.kind}] ${evt.description}`)
      .join(" | ");

    const extra = events.length > 5 ? ` (+${events.length - 5} more)` : "";

    await this.store.appendBlock(this.options.chain ?? "journal", {
      type: "journal",
      content: `Shell activity: ${summary}${extra}`,
      tags: Array.from(uniqueTags),
      agent: "daemon",
    });
  }

  private resolveHistoryFile(): string | undefined {
    const candidates = this.options.historyPaths ?? DEFAULT_HISTORY_FILES;
    return candidates.find(file => existsSync(file));
  }

  private detectEvent(line: string): ShellEvent | null {
    if (!line) return null;

    if (/\b(npm|pnpm|yarn)\s+(install|add)\b/i.test(line)) {
      return {
        kind: "dependency",
        description: line,
        tags: ["npm"],
      };
    }

    if (/\bgit\s+(commit|push|merge|switch|checkout|rebase)\b/i.test(line)) {
      return {
        kind: "git",
        description: line,
        tags: ["git"],
      };
    }

    if (/\b(vim|nvim|nano|code|touch)\s+/.test(line)) {
      return {
        kind: "edit",
        description: line,
        tags: ["editor"],
      };
    }

    if (/(error|ERR!|Traceback|Exception|command not found)/i.test(line)) {
      return {
        kind: "error",
        description: line,
        tags: ["error"],
      };
    }

    return null;
  }

  private normalizeLine(line: string): string {
    if (!line) return "";
    if (line.startsWith(":")) {
      const idx = line.indexOf(";");
      if (idx !== -1) {
        return line.slice(idx + 1).trim();
      }
    }
    return line.trim();
  }

  private updateFileState(path: string, size: number): void {
    this.state.update(state => {
      if (!state.shell) state.shell = { files: {} };
      if (!state.shell.files) state.shell.files = {};
      state.shell.files[path] = {
        size,
        updatedAt: new Date().toISOString(),
      };
    });
  }
}
