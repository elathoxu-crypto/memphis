import { Store } from "../../memory/store.js";
import { Collector } from "../types.js";
import { loadConfig, type MemphisConfig } from "../../config/loader.js";
import { shareSyncCommand, exportShareBlocks, type ShareSyncSummary } from "../../cli/share-sync.js";
import { assertOperation } from "../../security/rls.js";

export class ShareCollector implements Collector {
  public readonly name = "share";

  constructor(private readonly store: Store) {}

  private pinataConfigured(config: MemphisConfig): boolean {
    const pinata = config.integrations?.pinata ?? {};
    return Boolean(
      pinata.jwt ||
      (pinata.apiKey && pinata.apiSecret) ||
      process.env.PINATA_JWT ||
      (process.env.PINATA_API_KEY && (process.env.PINATA_API_SECRET || process.env.PINATA_SECRET))
    );
  }

  private isPushDisabled(config: MemphisConfig): boolean {
    const pinata = (config.integrations?.pinata ?? {}) as Record<string, unknown>;
    const shareCfg = (config as Record<string, any>).share ?? {};
    const directFlag = pinata.pushDisabled ?? pinata.push_disabled ?? shareCfg.pushDisabled ?? shareCfg.push_disabled;
    if (typeof directFlag === "boolean") {
      return directFlag;
    }
    return process.env.MEMPHIS_SHARE_PUSH_DISABLED === "1";
  }

  private async hasShareBlocks(): Promise<boolean> {
    const payloads = await exportShareBlocks(this.store, 1);
    return payloads.length > 0;
  }

  private async logResult(total: number): Promise<void> {
    await this.store.appendBlock("journal", {
      type: "system",
      content: `[daemon:share] synced ${total} blocks`,
      tags: ["daemon", "share", "sync"],
      agent: "daemon",
    });
  }

  async collect(): Promise<void> {
    const config = loadConfig();
    try {
      assertOperation("collector.share");
    } catch (error) {
      console.warn(`[daemon:share] operation disabled: ${error instanceof Error ? error.message : error}`);
      return;
    }
    if (this.isPushDisabled(config)) {
      return;
    }
    if (!this.pinataConfigured(config)) {
      return;
    }
    if (!(await this.hasShareBlocks())) {
      return;
    }

    let summary: ShareSyncSummary | undefined;
    try {
      summary = await shareSyncCommand({
        all: true,
        pushDisabled: false,
      });
    } catch (err) {
      console.error("[daemon:share] sync failed:", err);
      return;
    }

    const synced = (summary?.pushed ?? 0) + (summary?.pulled ?? 0);
    await this.logResult(synced);
  }
}
