/**
 * Memphis Nexus TUI - Proof of Concept
 * Multi-agent chat interface using @mariozechner/pi-tui
 */

import { TUI, Text, Box, Container, ProcessTerminal, Editor } from "@mariozechner/pi-tui";
import chalk from "chalk";
import { NexusChainIntegration } from "./nexus-chain.js";

// ─────────────────────────────────────────────────────────────────────────────
// AGENT IDENTITY
// ─────────────────────────────────────────────────────────────────────────────

interface AgentIdentity {
  id: string;
  name: string;
  emoji: string;
  status: "online" | "offline" | "busy";
}

const NEXUS_AGENTS: AgentIdentity[] = [
  { id: "memphis", name: "Memphis", emoji: "🧠", status: "online" },
  { id: "watra", name: "Watra", emoji: "🔥", status: "online" },
  { id: "style", name: "Style", emoji: "💎", status: "offline" },
];

const CURRENT_AGENT = NEXUS_AGENTS[0]; // Memphis

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface NexusMessage {
  id: string;
  from: AgentIdentity;
  to: "all" | AgentIdentity;
  content: string;
  timestamp: Date;
  type: "chat" | "status" | "task";
}

// ─────────────────────────────────────────────────────────────────────────────
// NEXUS CHAT TUI
// ─────────────────────────────────────────────────────────────────────────────

export class NexusChatTUI {
  private messages: NexusMessage[] = [];
  private tui: TUI;
  private chatText: Text;
  private editor: any;
  private statusBar: Text;

  constructor() {
    this.messages = [
      {
        id: "1",
        from: NEXUS_AGENTS[1], // Watra
        to: "all",
        content: "Hej chłopaki, nad czym pracujemy?",
        timestamp: new Date(Date.now() - 60000),
        type: "chat"
      },
      {
        id: "2",
        from: NEXUS_AGENTS[0], // Memphis
        to: "all",
        content: "Testuje nowy TUI z multi-agent chat!",
        timestamp: new Date(Date.now() - 30000),
        type: "chat"
      }
    ];

    const terminal = new ProcessTerminal();
    this.tui = new TUI(terminal);
    this.chatText = new Text("");
    this.statusBar = new Text("", 1, 0);
    
    this.setupUI();
  }

  private setupUI() {
    // ─── Root Container ─────────────────────────────────────────────────────
    const root = new Container();
    
    // ─── Editor Theme ───────────────────────────────────────────────────────
    const editorTheme = {
      borderColor: (s: string) => chalk.cyan(s),
      selectList: {
        borderColor: (s: string) => chalk.gray(s),
        itemColor: (s: string) => chalk.white(s),
        selectedColor: (s: string) => chalk.cyan(s),
        descriptionColor: (s: string) => chalk.gray(s),
        selectedPrefix: (s: string) => chalk.cyan("→ " + s),
        selectedText: (s: string) => chalk.cyan(s),
        description: (s: string) => chalk.gray(s),
        scrollInfo: (s: string) => chalk.gray(s),
        noMatch: (s: string) => chalk.red(s)
      }
    };
    
    // ─── Header ─────────────────────────────────────────────────────────────
    const header = new Text(chalk.bold.cyan("Memphis Nexus") + " " + chalk.gray("[POC]"), 1, 0);
    root.addChild(header);

    // ─── Chat History (80% of screen) ───────────────────────────────────────
    this.chatText = new Text(this.renderChatHistory());
    root.addChild(this.chatText);

    // ─── Input Editor ────────────────────────────────────────────────────────
    this.editor = new Editor(this.tui, editorTheme);
    this.editor.onSubmit = (text: string) => {
      this.handleInput(text);
      // Note: pi-tui Editor clears itself after onSubmit
    };
    root.addChild(this.editor);

    // ─── Status Bar ──────────────────────────────────────────────────────────
    this.statusBar = new Text(this.renderStatusBar(), 1, 0);
    root.addChild(this.statusBar);

    // ─── Setup TUI ───────────────────────────────────────────────────────────
    this.tui.addChild(root);
    this.tui.setFocus(this.editor);
  }

  private renderChatHistory(): string {
    let output = "";
    
    for (const msg of this.messages) {
      const time = this.formatTime(msg.timestamp);
      const agent = msg.from;
      
      output += `\n${agent.emoji} ${chalk.bold(agent.name)} ${chalk.gray(time)}\n`;
      output += `  ${msg.content}\n`;
    }
    
    return output;
  }

  private renderStatusBar(): string {
    const onlineAgents = NEXUS_AGENTS.filter(a => a.status === "online");
    const agentStr = onlineAgents.map(a => `${a.emoji}${a.name}`).join(" ");
    
    return `Agents: ${agentStr} | Chains: 880+ blocks | Provider: ollama | ⏱️ ${this.formatTime(new Date())}`;
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  }

  private handleInput(text: string) {
    if (!text.trim()) return;

    if (text.startsWith("/")) {
      this.handleCommand(text);
    } else {
      this.sendMessage(text);
    }
  }

  private handleCommand(cmd: string) {
    const parts = cmd.split(" ");
    const command = parts[0].toLowerCase();

    switch (command) {
      case "/help":
        this.addSystemMessage("Commands: /help, /clear, /agents, /status");
        break;
      case "/clear":
        this.messages = [];
        this.updateChatBox();
        break;
      case "/agents":
        const agentsList = NEXUS_AGENTS.map(a => `${a.emoji} ${a.name} (${a.status})`).join(", ");
        this.addSystemMessage(`Agents: ${agentsList}`);
        break;
      case "/status":
        this.addSystemMessage("Status: OK | Chains: 880+ | Provider: ollama");
        break;
      default:
        this.addSystemMessage(`Unknown command: ${command}`);
    }
  }

  private sendMessage(content: string) {
    const msg: NexusMessage = {
      id: Date.now().toString(),
      from: CURRENT_AGENT,
      to: "all",
      content,
      timestamp: new Date(),
      type: "chat"
    };

    this.messages.push(msg);
    
    // Save to chain (async, non-blocking)
    setImmediate(() => {
      const result = NexusChainIntegration.saveMessageToChain(
        CURRENT_AGENT.name,
        content
      );
      
      if (result) {
        console.log(`[Nexus] Saved to chain: journal#${result.blockIndex}`);
        
        // Sync to IPFS (async)
        NexusChainIntegration.syncToIPFS().then(cid => {
          if (cid) {
            console.log(`[Nexus] Synced to IPFS: ${cid}`);
          }
        });
      }
    });
    
    this.updateChatBox();
  }

  private addSystemMessage(content: string) {
    const msg: NexusMessage = {
      id: Date.now().toString(),
      from: { id: "system", name: "System", emoji: "⚙️", status: "online" },
      to: "all",
      content,
      timestamp: new Date(),
      type: "status"
    };

    this.messages.push(msg);
    this.updateChatBox();
  }

  private updateChatBox() {
    // Text component doesn't allow direct text assignment
    // We need to remove and re-add the component
    // For now, just request a re-render
    this.tui.requestRender();
  }

  run() {
    this.tui.start();
  }

  // Compatibility with old TUI API (no-op for Nexus)
  navigateTo(screen: any) {
    // Nexus is a single-screen chat interface
    // No navigation needed
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RUN NEXUS CHAT TUI
// ─────────────────────────────────────────────────────────────────────────────

console.log("Starting Memphis Nexus Chat TUI...");
const nexus = new NexusChatTUI();
nexus.run();
