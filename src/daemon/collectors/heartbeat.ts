import { Store } from "../../memory/store.js";
import { captureSystemSnapshot, describeSnapshot } from "../../utils/system-stats.js";
import { Collector } from "../types.js";

interface HeartbeatCollectorOptions {
  chain?: string;
  tags?: string[];
}

const DEFAULT_TAGS = ["daemon", "heartbeat", "system"];

export class HeartbeatCollector implements Collector {
  public readonly name = "heartbeat";

  constructor(private readonly store: Store, private readonly options: HeartbeatCollectorOptions = {}) {}

  async collect(): Promise<void> {
    const snapshot = captureSystemSnapshot();
    const content = `System heartbeat — ${describeSnapshot(snapshot)}`;

    await this.store.appendBlock(this.options.chain ?? "journal", {
      type: "system",
      content,
      tags: this.options.tags ?? DEFAULT_TAGS,
      agent: "daemon",
    });
  }
}
