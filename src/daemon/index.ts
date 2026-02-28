import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync, openSync, closeSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { log } from "../utils/logger.js";
import { DAEMON_LOG_PATH, DAEMON_PID_PATH, MEMPHIS_HOME } from "../config/defaults.js";
import { loadConfig, type MemphisConfig } from "../config/loader.js";
import { Store } from "../memory/store.js";
import { DaemonStateStore } from "./state.js";
import { Collector } from "./types.js";
import { GitCollector } from "./collectors/git.js";
import { ShellCollector } from "./collectors/shell.js";
import { HeartbeatCollector } from "./collectors/heartbeat.js";

const DEFAULT_INTERVAL = 60_000;

interface CollectorSchedule {
  collector: Collector;
  interval: number;
  timer?: NodeJS.Timeout;
  running: boolean;
}

interface DaemonSpawnCommand {
  command: string;
  args: string[];
}

const projectRoot = fileURLToPath(new URL("../..", import.meta.url));

export class DaemonManager {
  constructor(
    private readonly pidPath: string = DAEMON_PID_PATH,
    private readonly logPath: string = DAEMON_LOG_PATH
  ) {}

  async start(): Promise<void> {
    if (this.isRunning()) {
      log.warn("Daemon already running");
      return;
    }

    this.ensureHome();
    const spawnInfo = this.resolveSpawnInfo();
    const logFd = openSync(this.logPath, "a");

    const child = spawn(spawnInfo.command, [...spawnInfo.args, "--daemon-run"], {
      detached: true,
      stdio: ["ignore", logFd, logFd],
      env: process.env,
    });

    closeSync(logFd);

    if (!child.pid) {
      log.error("Failed to start daemon (no PID)");
      return;
    }

    child.unref();
    writeFileSync(this.pidPath, String(child.pid), { encoding: "utf-8" });
    log.success(`Daemon started (pid ${child.pid})`);
  }

  async stop(): Promise<void> {
    const pid = this.readPid();
    if (!pid) {
      log.warn("Daemon not running");
      return;
    }

    try {
      process.kill(pid, "SIGTERM");
      log.info(`Sent SIGTERM to daemon ${pid}`);
    } catch (error) {
      log.warn(`Failed to signal daemon: ${error}`);
    } finally {
      this.removePid();
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 300));
    await this.start();
  }

  status(): void {
    const pid = this.readPid();
    if (pid && this.checkProcess(pid)) {
      log.info(`Daemon running (pid ${pid})`);
    } else {
      log.warn("Daemon not running");
    }
  }

  logs(lines = 50): void {
    if (!existsSync(this.logPath)) {
      log.warn("No daemon log file found");
      return;
    }
    const raw = readFileSync(this.logPath, "utf-8");
    const tail = raw.trim().split(/\r?\n/).slice(-lines);
    if (tail.length === 0) {
      log.info("Daemon log empty");
      return;
    }
    tail.forEach(line => console.log(line));
  }

  private ensureHome(): void {
    mkdirSync(dirname(this.pidPath), { recursive: true, mode: 0o700 });
    mkdirSync(dirname(this.logPath), { recursive: true, mode: 0o700 });
    mkdirSync(MEMPHIS_HOME, { recursive: true, mode: 0o700 });
  }

  private readPid(): number | null {
    if (!existsSync(this.pidPath)) return null;
    try {
      const value = readFileSync(this.pidPath, "utf-8").trim();
      const pid = Number.parseInt(value, 10);
      return Number.isFinite(pid) ? pid : null;
    } catch {
      return null;
    }
  }

  private removePid(): void {
    if (existsSync(this.pidPath)) {
      try {
        unlinkSync(this.pidPath);
      } catch {}
    }
  }

  private isRunning(): boolean {
    const pid = this.readPid();
    return pid ? this.checkProcess(pid) : false;
  }

  private checkProcess(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      this.removePid();
      return false;
    }
  }

  private resolveSpawnInfo(): DaemonSpawnCommand {
    const distEntry = join(projectRoot, "dist", "daemon", "index.js");
    if (existsSync(distEntry)) {
      return { command: process.execPath, args: [distEntry] };
    }

    const srcEntry = join(projectRoot, "src", "daemon", "index.ts");
    if (existsSync(srcEntry)) {
      const require = createRequire(import.meta.url);
      const tsxCli = require.resolve("tsx/dist/cli.js");
      return { command: process.execPath, args: [tsxCli, srcEntry] };
    }

    throw new Error("Unable to locate daemon entrypoint");
  }
}

class DaemonRuntime {
  private schedules: CollectorSchedule[] = [];
  private stopping = false;

  constructor(
    private readonly config: MemphisConfig,
    private readonly store: Store,
    private readonly state: DaemonStateStore
  ) {}

  start(): void {
    console.log(`[${new Date().toISOString()}] Memphis daemon starting`);
    const collectors = this.buildCollectors();
    collectors.forEach(schedule => this.scheduleCollector(schedule));

    process.once("SIGTERM", () => this.shutdown("SIGTERM"));
    process.once("SIGINT", () => this.shutdown("SIGINT"));
  }

  private buildCollectors(): CollectorSchedule[] {
    const schedules: CollectorSchedule[] = [];
    const daemonConfig = this.config.daemon ?? {};
    const collectorsConfig = daemonConfig.collectors ?? {};
    const baseInterval = daemonConfig.interval ?? DEFAULT_INTERVAL;

    if (collectorsConfig.git?.enabled ?? true) {
      const gitCollector = new GitCollector(this.store, this.state, {
        chain: "journal",
        repos: [
          { path: this.config.memory.path, label: "chains" },
          { path: process.cwd(), label: "workspace" },
        ],
        ...(collectorsConfig.git as Record<string, unknown>),
      });
      schedules.push({
        collector: gitCollector,
        interval: collectorsConfig.git?.interval ?? baseInterval,
        running: false,
      });
    }

    if (collectorsConfig.shell?.enabled ?? true) {
      const shellCollector = new ShellCollector(this.store, this.state, {
        chain: "journal",
        ...(collectorsConfig.shell as Record<string, unknown>),
      });
      schedules.push({
        collector: shellCollector,
        interval: collectorsConfig.shell?.interval ?? baseInterval,
        running: false,
      });
    }

    if (collectorsConfig.heartbeat?.enabled ?? true) {
      const heartbeatCollector = new HeartbeatCollector(this.store, {
        chain: "journal",
      });
      schedules.push({
        collector: heartbeatCollector,
        interval: collectorsConfig.heartbeat?.interval ?? baseInterval * 5,
        running: false,
      });
    }

    this.schedules = schedules;
    return schedules;
  }

  private scheduleCollector(schedule: CollectorSchedule): void {
    const run = async () => {
      if (this.stopping || schedule.running) return;
      schedule.running = true;
      try {
        await schedule.collector.collect();
      } catch (error) {
        console.error(`[daemon] Collector ${schedule.collector.name} failed:`, error);
      } finally {
        schedule.running = false;
      }
    };

    run().catch(err => console.error("[daemon] initial run failed:", err));
    schedule.timer = setInterval(() => {
      run().catch(err => console.error("[daemon] run failed:", err));
    }, schedule.interval);
  }

  async shutdown(reason: string): Promise<void> {
    if (this.stopping) return;
    this.stopping = true;
    console.log(`[${new Date().toISOString()}] Memphis daemon stopping (${reason})`);
    for (const schedule of this.schedules) {
      if (schedule.timer) clearInterval(schedule.timer);
      try {
        await schedule.collector.shutdown?.();
      } catch (error) {
        console.error(`[daemon] Collector ${schedule.collector.name} shutdown failed:`, error);
      }
    }
    process.exit(0);
  }
}

export function runDaemonProcess(): void {
  const config = loadConfig();
  const store = new Store(config.memory.path);
  const state = new DaemonStateStore();

  const runtime = new DaemonRuntime(config, store, state);
  runtime.start();
}

if (process.argv.includes("--daemon-run")) {
  runDaemonProcess();
}
