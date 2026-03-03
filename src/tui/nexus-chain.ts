/**
 * Memphis Nexus - Chain Integration
 * Every chat message = block in chain
 */

import { execSync } from "child_process";

export class NexusChainIntegration {
  /**
   * Save message to journal chain
   */
  static saveMessageToChain(from: string, content: string): { blockIndex: number; hash: string } | null {
    try {
      const taggedContent = `${from}: ${content}`;
      // Use __dirname to find Memphis root (dist/tui -> dist -> memphis root)
      const memphisRoot = require('path').resolve(__dirname, '..', '..');
      const result = execSync(
        `node dist/cli/index.js journal "${taggedContent}" --tags nexus,chat,${from.toLowerCase()}`,
        { encoding: "utf-8", cwd: memphisRoot }
      );

      // Parse output: "✓ [journal#123] abc123..."
      const match = result.match(/journal#(\d+)\]\s+([a-f0-9]+)/);
      if (match) {
        return {
          blockIndex: parseInt(match[1]),
          hash: match[2]
        };
      }
    } catch (err) {
      console.error("Failed to save message to chain:", err);
    }
    return null;
  }

  /**
   * Sync to IPFS (share chain)
   */
  static async syncToIPFS(): Promise<string | null> {
    try {
      const memphisRoot = require('path').resolve(__dirname, '..', '..');
      const result = execSync(
        "node dist/cli/index.js share-sync --push",
        { encoding: "utf-8", cwd: memphisRoot }
      );

      // Parse CID from output
      const match = result.match(/Qm[a-zA-Z0-9]{44}/);
      return match ? match[0] : null;
    } catch (err) {
      console.error("Failed to sync to IPFS:", err);
      return null;
    }
  }

  /**
   * Recall recent messages from chain
   */
  static recallMessages(limit: number = 10): Array<{ from: string; content: string; timestamp: Date }> {
    try {
      const result = execSync(
        `node dist/cli/index.js recall "nexus" --tag nexus --limit ${limit}`,
        { encoding: "utf-8", cwd: process.cwd() }
      );

      // Parse recall output
      // Format: "journal#123: Watra: Hej chłopaki..."
      const messages: Array<{ from: string; content: string; timestamp: Date }> = [];
      const lines = result.split("\n");

      for (const line of lines) {
        const match = line.match(/(\w+):\s+(.+)/);
        if (match) {
          messages.push({
            from: match[1],
            content: match[2],
            timestamp: new Date() // TODO: parse actual timestamp
          });
        }
      }

      return messages;
    } catch (err) {
      console.error("Failed to recall messages:", err);
      return [];
    }
  }
}
