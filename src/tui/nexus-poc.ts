/**
 * Memphis Nexus TUI - Proof of Concept
 * Multi-agent chat interface using @mariozechner/pi-tui
 */

import { TUI, Text, Box, Container, ProcessTerminal, Editor } from "@mariozechner/pi-tui";
import chalk from "chalk";
import { NexusChainIntegration } from "./nexus-chain.js";
import * as fs from "fs";
import * as path from "path";
import { checkTimeTriggers, type Suggestion } from "../intelligence/suggestions.js";
import { recall, type RecallQuery, type RecallHit } from "../core/recall.js";
import { Store } from "../memory/store.js";

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
// CHAIN STATS LOADER
// ─────────────────────────────────────────────────────────────────────────────

interface ChainStats {
  journal: number;
  ask: number;
  decisions: number;
  summary: number;
  lastActivity: Date | null;
}

interface IntelligenceStats {
  acceptedPatterns: number;
  rejectedPatterns: number;
  totalFeedback: number;
}

interface ProviderStatus {
  name: string;
  model: string;
  ready: boolean;
}

function loadChainStats(): ChainStats {
  const chainsPath = path.join(process.env.HOME || "/root", ".memphis", "chains");
  
  const countBlocks = (chainName: string): number => {
    const chainPath = path.join(chainsPath, chainName);
    try {
      return fs.readdirSync(chainPath).filter(f => f.endsWith(".json")).length;
    } catch {
      return 0;
    }
  };
  
  const getLastActivity = (): Date | null => {
    const journalPath = path.join(chainsPath, "journal");
    try {
      const files = fs.readdirSync(journalPath)
        .filter(f => f.endsWith(".json"))
        .map(f => ({
          name: f,
          time: fs.statSync(path.join(journalPath, f)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time);
      
      return files.length > 0 ? new Date(files[0].time) : null;
    } catch {
      return null;
    }
  };
  
  return {
    journal: countBlocks("journal"),
    ask: countBlocks("ask"),
    decisions: countBlocks("decision"),
    summary: countBlocks("summary"),
    lastActivity: getLastActivity()
  };
}

function loadIntelligenceStats(): IntelligenceStats {
  const intelPath = path.join(process.env.HOME || "/root", ".memphis", "intelligence", "learning-data.json");
  
  try {
    const data = JSON.parse(fs.readFileSync(intelPath, "utf8"));
    const accepted = Object.keys(data.acceptedPatterns || {}).reduce((sum, key) => {
      return sum + (data.acceptedPatterns[key] || 0);
    }, 0);
    const rejected = Object.keys(data.rejectedPatterns || {}).reduce((sum, key) => {
      return sum + (data.rejectedPatterns[key] || 0);
    }, 0);
    
    return {
      acceptedPatterns: Object.keys(data.acceptedPatterns || {}).length,
      rejectedPatterns: Object.keys(data.rejectedPatterns || {}).length,
      totalFeedback: accepted + rejected
    };
  } catch {
    return { acceptedPatterns: 0, rejectedPatterns: 0, totalFeedback: 0 };
  }
}

function loadProviderStatus(): ProviderStatus {
  const configPath = path.join(process.env.HOME || "/root", ".memphis", "config.yaml");
  
  try {
    const config = fs.readFileSync(configPath, "utf8");
    const providerMatch = config.match(/providers:\s*\n\s+(\w+):\s*\n\s+url:.*\n\s+model:\s*(\S+)/);
    
    if (providerMatch) {
      return {
        name: providerMatch[1],
        model: providerMatch[2],
        ready: true // Could add actual health check
      };
    }
  } catch {}
  
  return { name: "unknown", model: "unknown", ready: false };
}

function formatTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function loadRecentMessages(count: number = 5): NexusMessage[] {
  const askPath = path.join(process.env.HOME || "/root", ".memphis", "chains", "ask");
  const messages: NexusMessage[] = [];
  
  try {
    const files = fs.readdirSync(askPath)
      .filter(f => f.endsWith(".json"))
      .sort((a, b) => {
        const numA = parseInt(a.replace(".json", ""));
        const numB = parseInt(b.replace(".json", ""));
        return numB - numA; // Descending order
      })
      .slice(0, count);
    
    for (const file of files) {
      try {
        const blockPath = path.join(askPath, file);
        const content = fs.readFileSync(blockPath, "utf8");
        const block = JSON.parse(content);
        
        // Extract content from data.content
        const fullContent = block.data?.content || block.prompt || block.text || "";
        
        // Split Q&A if present
        const parts = fullContent.split("\n\nA:");
        const question = parts[0].replace("Q: ", "").substring(0, 150);
        const answer = parts[1] ? parts[1].split("\n\n---")[0].trim().substring(0, 150) : "";
        
        // Add question
        messages.push({
          id: `${file}-q`,
          from: { id: "user", name: "User", emoji: "👤", status: "online" },
          to: "all",
          content: question,
          timestamp: new Date(block.timestamp || Date.now()),
          type: "chat"
        });
        
        // Add answer if present
        if (answer) {
          messages.push({
            id: `${file}-a`,
            from: NEXUS_AGENTS[0], // Memphis
            to: "all",
            content: answer + (answer.length >= 150 ? "..." : ""),
            timestamp: new Date(block.timestamp || Date.now()),
            type: "chat"
          });
        }
      } catch {}
    }
    
    return messages.reverse(); // Oldest first
  } catch {
    return [];
  }
}

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
  private suggestions: Suggestion[] = [];
  private tui: TUI;
  private chatText: Text;
  private editor: any;
  private statusBar: Text;
  private suggestionsWidget: Text;
  private similarMessages: RecallHit[] = [];

  constructor() {
    // Load recent messages from ask chain
    this.messages = loadRecentMessages(5);
    
    // Load time-based suggestions
    this.suggestions = this.loadSuggestions();
    
    // Add welcome message if no messages loaded
    if (this.messages.length === 0) {
      this.messages = [
        {
          id: "welcome",
          from: NEXUS_AGENTS[0], // Memphis
          to: "all",
          content: "Welcome to Memphis Nexus! Type a message or /help for commands.",
          timestamp: new Date(),
          type: "status"
        }
      ];
    }

    const terminal = new ProcessTerminal();
    this.tui = new TUI(terminal);
    this.chatText = new Text("");
    this.statusBar = new Text("", 1, 0);
    this.suggestionsWidget = new Text("", 1, 0);
    
    this.setupUI();
  }
  
  private loadSuggestions(): Suggestion[] {
    const stats = loadChainStats();
    if (!stats.lastActivity) return [];
    
    return checkTimeTriggers(stats.lastActivity.getTime());
  }
  
  private async loadSimilarMessages(content: string): Promise<void> {
    if (content.length < 10) {
      this.similarMessages = [];
      return;
    }
    
    try {
      const memphisHome = process.env.HOME || "/root";
      const store = new Store(path.join(memphisHome, ".memphis", "chains"));
      const query: RecallQuery = {
        text: content,
        limit: 3
      };
      
      const result = await recall(store, query);
      this.similarMessages = result.hits.filter(h => h.score > 0.7);
      
      // Update widget if we have similar messages
      if (this.similarMessages.length > 0) {
        this.updateSimilarMessagesWidget();
      }
    } catch {
      this.similarMessages = [];
    }
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

    // ─── Suggestions Widget ─────────────────────────────────────────────────
    if (this.suggestions.length > 0) {
      this.suggestionsWidget = new Text(this.renderSuggestions(), 1, 0);
      root.addChild(this.suggestionsWidget);
    }

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

  private renderSuggestions(): string {
    if (this.suggestions.length === 0) return "";
    
    let output = "\n";
    output += chalk.bold.yellow("💡 Suggestions") + " " + chalk.gray(`(${this.suggestions.length})`) + "\n";
    
    for (const suggestion of this.suggestions) {
      const priorityColor = 
        suggestion.priority === 'high' ? chalk.red :
        suggestion.priority === 'medium' ? chalk.yellow :
        chalk.gray;
      
      output += `  ${priorityColor('●')} ${suggestion.message}\n`;
    }
    
    output += chalk.gray(`  [a] accept [d] dismiss`) + "\n";
    output += "\n";
    
    return output;
  }

  private renderStatusBar(): string {
    const stats = loadChainStats();
    const intel = loadIntelligenceStats();
    const provider = loadProviderStatus();
    const syncStatus = this.getSyncStatus();
    
    // Time since last activity
    const lastActivity = stats.lastActivity 
      ? `Last: ${formatTimeSince(stats.lastActivity)} ago`
      : "No activity";
    
    // Provider status indicator
    const providerIcon = provider.ready ? "✓" : "✗";
    const providerStr = `${providerIcon} ${provider.name}/${provider.model.split(":")[0]}`;
    
    // Intelligence stats
    const intelStr = intel.totalFeedback > 0 
      ? `🧠 ${intel.totalFeedback} learned`
      : "";
    
    // Chain summary
    const chainStr = `📚 ${stats.journal} journal`;
    
    // Sync status
    const syncIcon = syncStatus.startsWith("✅") ? "✅" : 
                     syncStatus.startsWith("🔄") ? "🔄" : "○";
    const syncStr = `${syncIcon}`;
    
    // Suggestions count
    const suggestionStr = this.suggestions.length > 0 
      ? chalk.bold.yellow(`💡 ${this.suggestions.length}`)
      : "";
    
    // Keyboard hints (context-aware)
    const hints = this.suggestions.length > 0 
      ? "[a] accept [d] dismiss [q] quit"
      : "[q] quit [h] help";
    
    // Compose status bar
    const parts = [
      chainStr,
      lastActivity,
      providerStr,
      intelStr,
      suggestionStr,
      syncStr,
      chalk.gray(hints),
      chalk.gray(`⏱️ ${this.formatTime(new Date())}`)
    ].filter(p => p); // Remove empty parts
    
    return parts.join(" │ ");
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
        this.addSystemMessage("Commands: /help, /clear, /agents, /status, /suggestions, /search <query>, /sync");
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
        const stats = loadChainStats();
        const intel = loadIntelligenceStats();
        const provider = loadProviderStatus();
        const syncStatus = this.getSyncStatus();
        
        let statusMsg = `Status: OK | Journal: ${stats.journal} | Ask: ${stats.ask} | Provider: ${provider.name}/${provider.model}`;
        if (intel.totalFeedback > 0) {
          statusMsg += ` | Learned: ${intel.totalFeedback}`;
        }
        statusMsg += ` | Sync: ${syncStatus}`;
        this.addSystemMessage(statusMsg);
        break;
      case "/suggestions":
        if (this.suggestions.length === 0) {
          this.addSystemMessage("No pending suggestions");
        } else {
          this.addSystemMessage(`Pending suggestions: ${this.suggestions.length}`);
        }
        break;
      case "/search":
      case "/recall":
      case "/s":
        const searchQuery = parts.slice(1).join(" ");
        if (!searchQuery) {
          this.addSystemMessage("Usage: /search <query>");
        } else {
          this.searchMemories(searchQuery);
        }
        break;
      case "/sync":
        this.showSyncStatus();
        break;
      case "/a":
      case "/accept":
        this.acceptSuggestion();
        break;
      case "/d":
      case "/dismiss":
        this.dismissSuggestion();
        break;
      case "/j":
      case "/journal":
        const journalText = parts.slice(1).join(" ");
        if (!journalText) {
          this.addSystemMessage("Usage: /journal <text>");
        } else {
          this.quickJournal(journalText);
        }
        break;
      default:
        this.addSystemMessage(`Unknown command: ${command}. Type /help for available commands.`);
    }
  }
  
  private async searchMemories(query: string) {
    this.showTypingIndicator();
    
    try {
      const memphisHome = process.env.HOME || "/root";
      const store = new Store(path.join(memphisHome, ".memphis", "chains"));
      const recallQuery: RecallQuery = {
        text: query,
        limit: 10
      };
      
      const result = await recall(store, recallQuery);
      
      this.hideTypingIndicator();
      
      if (result.hits.length === 0) {
        this.addSystemMessage(`No results found for "${query}"`);
        return;
      }
      
      // Show results inline
      this.addSystemMessage(`🔍 Found ${result.hits.length} results for "${query}":`);
      
      for (const hit of result.hits.slice(0, 5)) {
        const score = (hit.score * 100).toFixed(0);
        const emoji = hit.score > 0.8 ? "🎯" : hit.score > 0.6 ? "✓" : "○";
        this.addSystemMessage(`${emoji} [${score}%] ${hit.chain}#${hit.index} — ${hit.snippet.substring(0, 100)}...`);
      }
      
      if (result.hits.length > 5) {
        this.addSystemMessage(`  ...and ${result.hits.length - 5} more`);
      }
      
    } catch (error) {
      this.hideTypingIndicator();
      this.addSystemMessage(`✗ Search failed: ${error}`);
    }
  }
  
  private getSyncStatus(): string {
    const networkPath = path.join(process.env.HOME || "/root", ".memphis", "network-chain.jsonl");
    
    try {
      if (!fs.existsSync(networkPath)) {
        return "○ Not configured";
      }
      
      const stats = fs.statSync(networkPath);
      const age = Date.now() - stats.mtime.getTime();
      
      if (age < 60000) { // < 1 min
        return "🔄 Syncing";
      } else if (age < 3600000) { // < 1 hour
        const mins = Math.floor(age / 60000);
        return `✅ Synced ${mins}m ago`;
      } else {
        const hours = Math.floor(age / 3600000);
        return `✅ Synced ${hours}h ago`;
      }
    } catch {
      return "⚠ Unknown";
    }
  }
  
  private showSyncStatus() {
    const status = this.getSyncStatus();
    const networkPath = path.join(process.env.HOME || "/root", ".memphis", "network-chain.jsonl");
    
    let message = `Sync Status: ${status}`;
    
    try {
      if (fs.existsSync(networkPath)) {
        const content = fs.readFileSync(networkPath, "utf8");
        const lines = content.trim().split("\n").filter(l => l.trim());
        const ops = lines.length;
        message += `\n  Network operations: ${ops}`;
        
        if (ops > 0) {
          const lastOp = JSON.parse(lines[lines.length - 1]);
          message += `\n  Last op: ${lastOp.type || "unknown"}`;
        }
      }
    } catch {}
    
    this.addSystemMessage(message);
  }
  
  private acceptSuggestion() {
    if (this.suggestions.length === 0) {
      this.addSystemMessage("No suggestions to accept");
      return;
    }
    
    const suggestion = this.suggestions[0];
    this.suggestions.shift();
    
    this.addSystemMessage(`✓ Accepted: ${suggestion.message}`);
    this.addSystemMessage("Opening journal... (use: /journal <text> to save)");
    
    this.updateSuggestionsWidget();
  }
  
  private dismissSuggestion() {
    if (this.suggestions.length === 0) {
      this.addSystemMessage("No suggestions to dismiss");
      return;
    }
    
    const suggestion = this.suggestions[0];
    this.suggestions.shift();
    
    this.addSystemMessage(`✗ Dismissed: ${suggestion.message}`);
    
    this.updateSuggestionsWidget();
  }
  
  private updateSuggestionsWidget() {
    // Re-render suggestions widget
    if (this.suggestions.length > 0) {
      // Widget will show new suggestions on next render
    } else {
      // Clear widget
    }
    this.tui.requestRender();
  }
  
  private updateSimilarMessagesWidget() {
    if (this.similarMessages.length === 0) return;
    
    let output = "\n" + chalk.bold.blue("💬 Similar Messages") + "\n";
    
    for (const hit of this.similarMessages) {
      const score = (hit.score * 100).toFixed(0);
      output += `  ${chalk.gray(`[${score}%]`)} ${hit.snippet.substring(0, 80)}...\n`;
    }
    
    output += chalk.gray("  Press ESC to dismiss") + "\n";
    
    this.suggestionsWidget.setText(output);
    this.tui.requestRender();
  }
  
  private quickJournal(text: string) {
    this.showTypingIndicator();
    
    setImmediate(async () => {
      try {
        // Save directly to journal chain
        const result = NexusChainIntegration.saveMessageToChain(
          "User",
          `[JOURNAL] ${text}`
        );
        
        this.hideTypingIndicator();
        
        if (result) {
          this.addSystemMessage(`✓ Saved to journal#${result.blockIndex}`);
          // Reload suggestions (activity changed)
          this.suggestions = this.loadSuggestions();
          this.updateSuggestionsWidget();
        } else {
          this.addSystemMessage("✗ Failed to save journal entry");
        }
      } catch (error) {
        this.hideTypingIndicator();
        this.addSystemMessage(`✗ Error: ${error}`);
      }
    });
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
  
  private showTypingIndicator() {
    const typingMsg: NexusMessage = {
      id: "typing",
      from: NEXUS_AGENTS[0],
      to: "all",
      content: "Memphis is thinking...",
      timestamp: new Date(),
      type: "status"
    };
    
    this.messages.push(typingMsg);
    this.updateChatBox();
  }
  
  private hideTypingIndicator() {
    this.messages = this.messages.filter(m => m.id !== "typing");
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
// NO AUTO-START - TUI should only run when explicitly called via 'memphis tui'
// ─────────────────────────────────────────────────────────────────────────────
