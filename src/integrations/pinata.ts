import https from "https";
import { pathToFileURL } from "url";

export interface PinataConfig {
  jwt?: string;
  apiKey?: string;
  apiSecret?: string;
  maxPins: number;
  ttlDays: number;
  cleanupEnabled: boolean;
}

export interface MemoryBlock {
  agent: string;
  timestamp: string;
  type: "thought" | "question" | "answer" | "context";
  size: string;
  content: string;
}

export class PinataBridge {
  private config: PinataConfig;
  private baseUrl = "api.pinata.cloud";

  constructor(config: PinataConfig) {
    if (!config.jwt && !(config.apiKey && config.apiSecret)) {
      throw new Error("Pinata config requires either JWT or apiKey+apiSecret");
    }
    this.config = config;
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.config.jwt) {
      headers["Authorization"] = `Bearer ${this.config.jwt}`;
    } else if (this.config.apiKey && this.config.apiSecret) {
      headers["pinata_api_key"] = this.config.apiKey;
      headers["pinata_secret_api_key"] = this.config.apiSecret;
    }
    return headers;
  }

  private async request(path: string, method: string, body?: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.baseUrl,
        path: path,
        method: method,
        headers: this.buildHeaders(),
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsed);
            } else {
              reject(new Error(`${parsed.error?.details || JSON.stringify(parsed)}`));
            }
          } catch {
            reject(new Error(data));
          }
        });
      });

      req.on("error", reject);
      if (body) req.write(body);
      req.end();
    });
  }

  async pinJSON(data: MemoryBlock): Promise<string> {
    // Validate size (max 2KB)
    const json = JSON.stringify(data);
    const sizeKB = json.length / 1024;

    if (sizeKB > 2) {
      throw new Error(`Payload exceeds 2KB limit (${sizeKB.toFixed(2)}KB)`);
    }

    const body = JSON.stringify({
      pinataContent: data,
      pinataMetadata: {
        name: `${data.agent}_${data.timestamp}`,
      },
    });

    const result = await this.request("/pinning/pinJSONToIPFS", "POST", body);
    return result.IpfsHash;
  }

  async unpin(hash: string): Promise<void> {
    await this.request(`/pinning/unpin/${hash}`, "DELETE");
  }

  async getPinned(): Promise<Array<{ hash: string; name: string; date: string }>> {
    const result = await this.request("/data/pinList", "GET");
    return result.rows.map((row: any) => ({
      hash: row.ipfs_pin_hash,
      name: row.metadata?.name,
      date: row.date_pinned,
    }));
  }

  async cleanupOldPins(): Promise<number> {
    if (!this.config.cleanupEnabled) return 0;

    const pins = await this.getPinned();
    const ttlMs = this.config.ttlDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    let removed = 0;

    // Remove old pins (TTL)
    for (const pin of pins) {
      const pinDate = new Date(pin.date).getTime();

      if (now - pinDate > ttlMs) {
        await this.unpin(pin.hash);
        removed++;
      }
    }

    // Remove excess pins (limit)
    const remaining = await this.getPinned();
    while (remaining.length > this.config.maxPins) {
      const oldest = remaining.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      )[0];

      await this.unpin(oldest.hash);
      removed++;
    }

    return removed;
  }

  async getStatus(): Promise<{ total: number; limit: number }> {
    const pins = await this.getPinned();
    return {
      total: pins.length,
      limit: this.config.maxPins,
    };
  }
}

// CLI entry point
async function main() {
  const command = process.argv[2];

  const jwt = process.env.PINATA_JWT || undefined;
  const apiKey = process.env.PINATA_API_KEY || undefined;
  const apiSecret = process.env.PINATA_API_SECRET || process.env.PINATA_SECRET || undefined;

  if (!jwt && !(apiKey && apiSecret)) {
    console.error("Error: provide PINATA_JWT or PINATA_API_KEY + PINATA_SECRET");
    process.exit(1);
  }

  const pinata = new PinataBridge({
    jwt,
    apiKey,
    apiSecret,
    maxPins: 100,
    ttlDays: 7,
    cleanupEnabled: true,
  });

  switch (command) {
    case "pin": {
      const block: MemoryBlock = JSON.parse(process.argv[3] || "{}");
      const hash = await pinata.pinJSON(block);
      console.log(`Pinned: ipfs.io/ipfs/${hash}`);
      break;
    }
    case "cleanup": {
      const removed = await pinata.cleanupOldPins();
      console.log(`Removed ${removed} old pins`);
      break;
    }
    case "status": {
      const status = await pinata.getStatus();
      console.log(`Pins: ${status.total}/${status.limit}`);
      break;
    }
    default:
      console.log("Usage: pinata <pin|cleanup|status> [json]");
  }
}

const isDirectRun = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isDirectRun) {
  main().catch(console.error);
}
