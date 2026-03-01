/**
 * Reflection Collector — Autonomous Reflection Loop
 *
 * Runs periodic reflections and captures insights:
 * - Daily light reflection
 * - Weekly deep reflection
 * - Saves to reflection chain
 * - Emits suggestions via OpenClaw events
 */

import { Store } from "../../memory/store.js";
import { reflect, type ReflectionMode, type ReflectionReport } from "../../core/reflection.js";
import { Collector } from "../types.js";
import { log } from "../../utils/logger.js";

interface ReflectionCollectorOptions {
  mode?: ReflectionMode;
  chain?: string;
  save?: boolean;
  notify?: boolean;
  interval?: number;
}

const DEFAULT_MODE: ReflectionMode = "daily";
const DEFAULT_CHAIN = "reflection";
const REFLECTION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export class ReflectionCollector implements Collector {
  public readonly name = "reflection";
  private lastRun: Date | null = null;

  constructor(
    private readonly store: Store,
    private readonly options: ReflectionCollectorOptions = {}
  ) {}

  async collect(): Promise<void> {
    const mode = this.options.mode ?? DEFAULT_MODE;
    const chain = this.options.chain ?? DEFAULT_CHAIN;
    const save = this.options.save ?? true;

    log.info(`[reflection] Starting ${mode} reflection...`);

    try {
      const report = await reflect(this.store, {
        mode,
        save,
        dryRun: false,
      });

      this.lastRun = new Date();
      log.info(`[reflection] Generated ${report.insights.length} insights in ${report.durationMs}ms`);

      // Log key insights
      if (report.insights.length > 0) {
        const topInsight = report.insights[0];
        log.info(`[reflection] Top insight: ${topInsight.title}`);
      }

      // Emit notification if enabled and significant insights found
      if (this.options.notify && report.insights.length > 0) {
        await this.emitNotification(report);
      }

      // Stats logging
      log.debug(`[reflection] Stats: ${report.stats.journalBlocks} journal, ${report.stats.decisions} decisions`);
    } catch (error) {
      log.error(`[reflection] Failed: ${(error as Error).message}`);
    }
  }

  private async emitNotification(report: ReflectionReport): Promise<void> {
    const topInsights = report.insights.slice(0, 3);
    if (topInsights.length === 0) return;

    const message = `🧠 Memphis Reflection (${report.mode})\n\n` +
      topInsights.map((i, idx) => `${idx + 1}. ${i.title}`).join("\n");

    try {
      // Use OpenClaw event system if available
      const { exec } = await import("node:child_process");
      exec(`openclaw system event --text '${message.replace(/'/g, "'\"'\"'")}' --mode now`, (error) => {
        if (error) {
          log.debug(`[reflection] Notification failed: ${error.message}`);
        }
      });
    } catch {
      // Silently fail if OpenClaw not available
    }
  }

  shutdown(): Promise<void> {
    log.info(`[reflection] Collector shutdown (last run: ${this.lastRun?.toISOString() ?? "never"})`);
    return Promise.resolve();
  }
}
