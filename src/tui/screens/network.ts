/**
 * Memphis TUI – Network Explorer Screen
 * Visualizes agent network topology and sync status
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import type { Store } from "../../memory/store.js";
import type { TUIWidgets } from "../app.js";
import type { TUIState } from "../state.js";

interface NetworkEntry {
  cid: string;
  agent: string;
  timestamp: string;
  chain: string;
  index: number;
  tags?: string[];
  status: "pinned" | "imported" | "failed";
}

function loadNetworkChain(): NetworkEntry[] {
  const networkPath = join(process.env.HOME || "", ".memphis", "network-chain.jsonl");
  if (!existsSync(networkPath)) return [];
  
  const content = readFileSync(networkPath, "utf-8");
  return content
    .trim()
    .split("\n")
    .filter(line => line.trim())
    .map(line => JSON.parse(line));
}

function getTimeSince(isoTimestamp: string): string {
  const then = new Date(isoTimestamp).getTime();
  const now = Date.now();
  const diff = Math.floor((now - then) / 1000);
  
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function renderNetwork(store: Store, state: TUIState): string {
  const networkChain = loadNetworkChain();
  const lastSync = networkChain.length > 0 
    ? networkChain[networkChain.length - 1]
    : null;
  
  // Count stats
  const pinned = networkChain.filter(e => e.status === "pinned").length;
  const imported = networkChain.filter(e => e.status === "imported").length;
  const uniqueAgents = [...new Set(networkChain.map(e => e.agent))];
  
  // Build topology ASCII art
  let topology = `{bold}{cyan}🌐 Network Topology{/cyan}{/bold}\n\n`;
  topology += `{green}        ┌─────────────────────────────┐{/green}\n`;
  topology += `{green}        │   Memphis Network (IPFS)    │{/green}\n`;
  topology += `{green}        └───────────┬─────────────────┘{/green}\n`;
  topology += `{green}                    │{/green}\n`;
  topology += `{green}        ┌───────────┴───────────┐{/green}\n`;
  topology += `{green}        │                       │{/green}\n`;
  topology += `{cyan}    ┌───▼───┐             ┌───▼───┐{/cyan}\n`;
  topology += `{cyan}    │ Watra │             │ Style │{/cyan}\n`;
  topology += `{cyan}    │(This) │◄────────────│(Main) │{/cyan}\n`;
  topology += `{cyan}    └───────┘  share-sync └───────┘{/cyan}\n`;
  topology += `{yellow}        │                       │{/yellow}\n`;
  topology += `{yellow}        └──────► Pinata ◄────────┘{/yellow}\n\n`;
  
  // Network status
  let content = topology;
  content += `{bold}📊 Network Status:{/bold}\n`;
  content += `   Agents:     {cyan}${uniqueAgents.length}{/cyan} (${uniqueAgents.join(", ") || "none"})\n`;
  content += `   Pinned:     {green}${pinned} blocks{/green}\n`;
  content += `   Imported:   {yellow}${imported} blocks{/yellow}\n`;
  content += `   Last sync:  ${lastSync ? getTimeSince(lastSync.timestamp) : "{red}never{/red}"}\n\n`;
  
  // Recent activity
  content += `{bold}🔗 Recent Network Activity:{/bold}\n`;
  if (networkChain.length === 0) {
    content += `{gray}   No network activity yet{/gray}\n`;
    content += `{gray}   Run: memphis share-sync --push{/gray}\n`;
  } else {
    const recent = networkChain.slice(-5).reverse();
    for (const entry of recent) {
      const statusIcon = entry.status === "pinned" ? "📤" : 
                         entry.status === "imported" ? "📥" : "❌";
      const shortCid = entry.cid.slice(0, 12) + "...";
      content += `   ${statusIcon} {cyan}${entry.agent}{/cyan} ${entry.chain}#${entry.index} ${shortCid} {gray}${getTimeSince(entry.timestamp)}{/gray}\n`;
    }
  }
  
  content += `\n{bold}⚡ Quick Actions:{/bold}\n`;
  content += `   [p] Push to network  (share-sync --push)\n`;
  content += `   [l] Pull from network (share-sync --pull)\n`;
  content += `   [s] Full sync        (share-sync --all)\n`;
  content += `   [r] Refresh status\n`;
  content += `   [c] View CID on IPFS gateway\n`;
  content += `   [q] Back to dashboard\n\n`;
  
  content += `{gray}Network Explorer v1.0 — Memphis Nexus{/gray}`;
  
  return content;
}

export function setupNetworkInput(
  store: Store,
  widgets: TUIWidgets,
  state: TUIState,
  navigate: (name: any) => void,
  onDone: () => void
): void {
  const { inputBox, inputField, contentBox, screen } = widgets;

  setTimeout(() => {
    inputBox.show();
    (inputField.options as any).placeholder = "Action (p/l/s/r/c/q):";
    inputField.focus();

    inputField.readInput((_err: any, value: any) => {
      const input = (value ?? "").trim().toLowerCase();

      if (input === "q") {
        navigate("dashboard");
        inputBox.hide();
        screen.render();
        onDone();
        return;
      }

      if (input === "r") {
        contentBox.setContent(renderNetwork(store, state));
        inputBox.hide();
        screen.render();
        onDone();
        return;
      }

      if (input === "p") {
        contentBox.setContent(
          `{yellow}⏳ Running share-sync --push...{/yellow}\n\n` +
          `{gray}This may take a moment...{/gray}`
        );
        screen.render();
        
        // Execute share-sync
        const { spawn } = require("child_process");
        const child = spawn("memphis", ["share-sync", "--push"], {
          stdio: "pipe",
          shell: true
        });
        
        let output = "";
        child.stdout.on("data", (data: Buffer) => {
          output += data.toString();
        });
        
        child.on("close", (code: number) => {
          const result = code === 0 
            ? `{green}✅ Push completed{/green}\n\n${output}`
            : `{red}❌ Push failed (exit ${code}){/red}\n\n${output}`;
          contentBox.setContent(result + "\n\nPress any key to continue...");
          inputBox.hide();
          screen.render();
          onDone();
        });
        return;
      }

      if (input === "l") {
        contentBox.setContent(
          `{yellow}⏳ Running share-sync --pull...{/yellow}\n\n` +
          `{gray}Fetching from IPFS...{/gray}`
        );
        screen.render();
        
        const { spawn } = require("child_process");
        const child = spawn("memphis", ["share-sync", "--pull"], {
          stdio: "pipe",
          shell: true
        });
        
        let output = "";
        child.stdout.on("data", (data: Buffer) => {
          output += data.toString();
        });
        
        child.on("close", (code: number) => {
          const result = code === 0 
            ? `{green}✅ Pull completed{/green}\n\n${output}`
            : `{red}❌ Pull failed (exit ${code}){/red}\n\n${output}`;
          contentBox.setContent(result + "\n\nPress any key to continue...");
          inputBox.hide();
          screen.render();
          onDone();
        });
        return;
      }

      if (input === "s") {
        contentBox.setContent(
          `{yellow}⏳ Running share-sync --all...{/yellow}\n\n` +
          `{gray}Full network sync...{/gray}`
        );
        screen.render();
        
        const { spawn } = require("child_process");
        const child = spawn("memphis", ["share-sync", "--all"], {
          stdio: "pipe",
          shell: true
        });
        
        let output = "";
        child.stdout.on("data", (data: Buffer) => {
          output += data.toString();
        });
        
        child.on("close", (code: number) => {
          const result = code === 0 
            ? `{green}✅ Sync completed{/green}\n\n${output}`
            : `{red}❌ Sync failed (exit ${code}){/red}\n\n${output}`;
          contentBox.setContent(result + "\n\nPress any key to continue...");
          inputBox.hide();
          screen.render();
          onDone();
        });
        return;
      }

      if (input === "c") {
        const networkChain = loadNetworkChain();
        if (networkChain.length === 0) {
          contentBox.setContent("{red}No CIDs available{/red}\n\nPress any key to continue...");
        } else {
          const lastCid = networkChain[networkChain.length - 1].cid;
          const gatewayUrl = `https://ipfs.io/ipfs/${lastCid}`;
          contentBox.setContent(
            `{cyan}Last CID:{/cyan} ${lastCid}\n\n` +
            `{bold}IPFS Gateway:{/bold}\n${gatewayUrl}\n\n` +
            `{gray}Copy URL to browser to view block on IPFS{/gray}\n\n` +
            `Press any key to continue...`
          );
        }
        inputBox.hide();
        screen.render();
        onDone();
        return;
      }

      // Default: just refresh
      inputBox.hide();
      screen.render();
      onDone();
    });
  }, 100);
}
