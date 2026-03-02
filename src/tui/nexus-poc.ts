/**
 * Memphis Nexus TUI - Proof of Concept
 * Multi-agent chat interface using @mariozechner/pi-tui
 */

import { TUI, Text, Box, Container, ProcessTerminal, Editor, type AutocompleteProvider, type AutocompleteItem } from "@mariozechner/pi-tui";
import chalk from "chalk";
import { NexusChainIntegration } from "./nexus-chain.js";
import * as fs from "fs";
import * as path from "path";
import { checkTimeTriggers, type Suggestion } from "../intelligence/suggestions.js";
import { recall, type RecallQuery, type RecallHit } from "../core/recall.js";
import { Store } from "../memory/store.js";

// ─────────────────────────────────────────────────────────────────────────────
// THEME SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

type ThemeMode = 'dark' | 'light';

interface Theme {
  mode: ThemeMode;
  primary: (s: string) => string;
  secondary: (s: string) => string;
  accent: (s: string) => string;
  muted: (s: string) => string;
  error: (s: string) => string;
  success: (s: string) => string;
  warning: (s: string) => string;
}

const DARK_THEME: Theme = {
  mode: 'dark',
  primary: chalk.cyan,
  secondary: chalk.blue,
  accent: chalk.magenta,
  muted: chalk.gray,
  error: chalk.red,
  success: chalk.green,
  warning: chalk.yellow
};

const LIGHT_THEME: Theme = {
  mode: 'light',
  primary: chalk.blue,
  secondary: chalk.cyan,
  accent: chalk.magenta,
  muted: chalk.gray,
  error: chalk.red,
  success: chalk.green,
  warning: chalk.yellow
};

// ─────────────────────────────────────────────────────────────────────────────
// KEYBOARD SHORTCUTS
// ─────────────────────────────────────────────────────────────────────────────

interface KeyboardShortcut {
  key: string;
  description: string;
  action: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// TUI CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

interface TUIConfig {
  theme: ThemeMode;
  sidebarEnabled: boolean;
  sidebarWidth: number;
  keybindings: {
    quickJournal: string;
    search: string;
    toggleSidebar: string;
    toggleTheme: string;
  };
  maxHistorySize: number;
}

const DEFAULT_TUI_CONFIG: TUIConfig = {
  theme: 'dark',
  sidebarEnabled: false,
  sidebarWidth: 35,
  keybindings: {
    quickJournal: 'Ctrl+J',
    search: 'Ctrl+R',
    toggleSidebar: 'Ctrl+S',
    toggleTheme: 'Ctrl+T'
  },
  maxHistorySize: 100
};

function loadTUIConfig(): TUIConfig {
  const configPath = path.join(process.env.HOME || "/root", ".memphis", "tui-config.json");
  
  try {
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, "utf8"));
      return { ...DEFAULT_TUI_CONFIG, ...data };
    }
  } catch {}
  
  return DEFAULT_TUI_CONFIG;
}

function saveTUIConfig(config: TUIConfig): void {
  const configPath = path.join(process.env.HOME || "/root", ".memphis", "tui-config.json");
  
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL SIDEBAR
// ─────────────────────────────────────────────────────────────────────────────

function loadRecentJournalEntries(limit: number = 10): Array<{ index: number; content: string; timestamp: Date }> {
  const journalPath = path.join(process.env.HOME || "/root", ".memphis", "chains", "journal");
  
  try {
    if (!fs.existsSync(journalPath)) return [];
    
    const files = fs.readdirSync(journalPath)
      .filter(f => f.endsWith(".json"))
      .map(f => {
        const filePath = path.join(journalPath, f);
        try {
          const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
          return {
            index: data.index || parseInt(f.replace(".json", "")),
            content: data.content || data.text || "",
            timestamp: new Date(data.timestamp || fs.statSync(filePath).mtime)
          };
        } catch {
          return null;
        }
      })
      .filter((e): e is NonNullable<typeof e> => e !== null)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
    
    return files;
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTOCOMPLETE PROVIDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Memphis command autocomplete provider for pi-tui Editor
 * Suggests commands like /j, /a, /search, etc.
 */
class MemphisAutocompleteProvider implements AutocompleteProvider {
  private commands: AutocompleteItem[] = [
    { value: "/j ", label: "/j", description: "Quick journal entry" },
    { value: "/a ", label: "/a", description: "Ask Memphis a question" },
    { value: "/d ", label: "/d", description: "Record a decision" },
    { value: "/search ", label: "/search", description: "Search memories" },
    { value: "/recall ", label: "/recall", description: "Recall from chains" },
    { value: "/s ", label: "/s", description: "Short alias for /search" },
    { value: "/sync", label: "/sync", description: "Show network sync status" },
    { value: "/theme", label: "/theme", description: "Toggle theme (dark/light)" },
    { value: "/sidebar", label: "/sidebar", description: "Toggle journal sidebar" },
    { value: "/history", label: "/history", description: "Show command history" },
    { value: "/config", label: "/config", description: "Show TUI configuration" },
    { value: "/export-config", label: "/export-config", description: "Export config to file" },
    { value: "/import-config", label: "/import-config", description: "Import config from file" },
    { value: "/reset-config", label: "/reset-config", description: "Reset to defaults" },
    { value: "/status", label: "/status", description: "Show system status" },
    { value: "/help", label: "/help", description: "Show available commands" },
    { value: "/clear", label: "/clear", description: "Clear chat history" },
    { value: "/quit", label: "/quit", description: "Exit TUI (or press q)" },
  ];

  getSuggestions(lines: string[], cursorLine: number, cursorCol: number): { items: AutocompleteItem[]; prefix: string; } | null {
    // Only autocomplete at start of first line (command mode)
    if (cursorLine !== 0 || cursorCol < 1) return null;
    
    const line = lines[0] || "";
    
    // Check if we're typing a command (starts with /)
    if (!line.startsWith("/")) return null;
    
    // Extract the prefix (command being typed)
    const prefix = line.substring(0, cursorCol);
    
    // Filter commands that match the prefix
    const items = this.commands.filter(cmd => 
      cmd.value.startsWith(prefix) || cmd.label.startsWith(prefix)
    );
    
    if (items.length === 0) return null;
    
    return { items, prefix };
  }

  applyCompletion(lines: string[], cursorLine: number, cursorCol: number, item: AutocompleteItem, prefix: string): { lines: string[]; cursorLine: number; cursorCol: number; } {
    // Replace the prefix with the completion
    const line = lines[0] || "";
    const beforePrefix = line.substring(0, line.indexOf(prefix));
    const afterCursor = line.substring(cursorCol);
    
    // Insert the completed value
    const newLine = beforePrefix + item.value + afterCursor;
    const newLines = [newLine, ...lines.slice(1)];
    
    // Position cursor after the completed text
    const newCursorCol = (beforePrefix + item.value).length;
    
    return { 
      lines: newLines, 
      cursorLine: 0, 
      cursorCol: newCursorCol 
    };
  }
}

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
  
  // Phase 4: Theme system
  private theme: Theme = DARK_THEME;
  private showJournalSidebar: boolean = false;
  private journalSidebarText: Text | null = null;
  private commandHistory: string[] = [];
  private historyIndex: number = -1;
  
  // Phase 5: Journal sidebar data
  private recentJournal: Array<{ index: number; content: string; timestamp: Date }> = [];
  private config: TUIConfig = DEFAULT_TUI_CONFIG;

  constructor() {
    // Phase 5: Load TUI configuration
    this.config = loadTUIConfig();
    this.theme = this.config.theme === 'dark' ? DARK_THEME : LIGHT_THEME;
    this.showJournalSidebar = this.config.sidebarEnabled;
    
    // Phase 5: Load recent journal entries
    this.recentJournal = loadRecentJournalEntries(15);
    
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
    
    // Setup autocomplete provider for Memphis commands
    const autocompleteProvider = new MemphisAutocompleteProvider();
    this.editor.setAutocompleteProvider(autocompleteProvider);
    this.editor.setAutocompleteMaxVisible(8);
    
    root.addChild(this.editor);

    // ─── Status Bar ──────────────────────────────────────────────────────────
    this.statusBar = new Text(this.renderStatusBar(), 1, 0);
    root.addChild(this.statusBar);

    // ─── Setup TUI ───────────────────────────────────────────────────────────
    this.tui.addChild(root);
    this.tui.setFocus(this.editor);
    
    // Phase 4: Setup keyboard shortcuts
    this.setupKeyboardShortcuts();
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 4: KEYBOARD SHORTCUTS
  // ─────────────────────────────────────────────────────────────────────────────
  
  private setupKeyboardShortcuts() {
    // Add global input listener for keyboard shortcuts
    this.tui.addInputListener((data: string) => {
      // Ctrl+J: Quick journal
      if (data === '\u0010' || data === '\x10') {
        this.triggerQuickJournal();
        return { consume: true };
      }
      
      // Ctrl+R: Search/Recall
      if (data === '\u0012' || data === '\x12') {
        this.triggerSearch();
        return { consume: true };
      }
      
      // Ctrl+S: Toggle sidebar
      if (data === '\u0013' || data === '\x13') {
        this.toggleJournalSidebar();
        return { consume: true };
      }
      
      // Ctrl+T: Toggle theme
      if (data === '\u0014' || data === '\x14') {
        this.toggleTheme();
        return { consume: true };
      }
      
      return undefined;
    });
  }
  
  private triggerQuickJournal() {
    // Pre-fill editor with /j command
    this.editor.setText("/j ");
    this.addSystemMessage("📝 Quick journal mode - type your entry and press Enter");
  }
  
  private triggerSearch() {
    // Pre-fill editor with /search command
    this.editor.setText("/search ");
    this.addSystemMessage("🔍 Search mode - type your query and press Enter");
  }
  
  private toggleJournalSidebar() {
    this.showJournalSidebar = !this.showJournalSidebar;
    
    // Update config
    this.config.sidebarEnabled = this.showJournalSidebar;
    saveTUIConfig(this.config);
    
    // Refresh journal data when opening
    if (this.showJournalSidebar) {
      this.recentJournal = loadRecentJournalEntries(15);
      this.addSystemMessage("📖 Journal sidebar enabled (Ctrl+S to toggle)");
    } else {
      this.addSystemMessage("📖 Journal sidebar disabled");
    }
    this.updateChatBox();
  }
  
  private toggleTheme() {
    this.theme = this.theme.mode === 'dark' ? LIGHT_THEME : DARK_THEME;
    
    // Update config
    this.config.theme = this.theme.mode;
    saveTUIConfig(this.config);
    
    this.addSystemMessage(`🎨 Theme: ${this.theme.mode} mode`);
    this.updateChatBox();
  }
  
  private addToCommandHistory(command: string) {
    // Avoid duplicates
    if (this.commandHistory[this.commandHistory.length - 1] !== command) {
      this.commandHistory.push(command);
      // Keep last 100 commands
      if (this.commandHistory.length > 100) {
        this.commandHistory.shift();
      }
    }
    // Also add to editor history for up/down navigation
    this.editor.addToHistory?.(command);
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 4: THEME HELPERS
  // ─────────────────────────────────────────────────────────────────────────────
  
  private getEditorTheme() {
    return {
      borderColor: this.theme.primary,
      selectList: {
        borderColor: this.theme.muted,
        itemColor: (s: string) => s,
        selectedColor: this.theme.primary,
        descriptionColor: this.theme.muted,
        selectedPrefix: (s: string) => this.theme.primary("→ " + s),
        selectedText: this.theme.primary,
        description: this.theme.muted,
        scrollInfo: this.theme.muted,
        noMatch: this.theme.error
      }
    };
  }

  private renderChatHistory(): string {
    let output = "";
    
    // Phase 5: Add journal sidebar if enabled
    if (this.showJournalSidebar) {
      output += this.renderJournalSidebar();
    }
    
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
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 5: JOURNAL SIDEBAR
  // ─────────────────────────────────────────────────────────────────────────────
  
  private renderJournalSidebar(): string {
    if (!this.showJournalSidebar || this.recentJournal.length === 0) {
      return "";
    }
    
    let output = "\n";
    output += chalk.bold(this.theme.primary("📖 Recent Journal")) + "\n";
    output += this.theme.muted("─".repeat(30)) + "\n";
    
    for (const entry of this.recentJournal.slice(0, 10)) {
      const time = this.formatTime(entry.timestamp);
      const preview = entry.content.substring(0, 50) + (entry.content.length > 50 ? "..." : "");
      output += `  ${this.theme.muted(`#${entry.index}`)} ${this.theme.muted(time)}\n`;
      output += `  ${preview}\n\n`;
    }
    
    output += this.theme.muted(`${this.recentJournal.length} entries`) + "\n";
    
    return output;
  }
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 5: CONFIG EXPORT/IMPORT
  // ─────────────────────────────────────────────────────────────────────────────
  
  private exportConfig() {
    const exportPath = path.join(process.env.HOME || "/root", ".memphis", "tui-config-export.json");
    
    try {
      const exportData = {
        ...this.config,
        commandHistory: this.commandHistory.slice(-50),
        exportedAt: new Date().toISOString()
      };
      
      fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2), "utf8");
      this.addSystemMessage(`✓ Config exported to: ${exportPath}`);
    } catch (error) {
      this.addSystemMessage(`✗ Export failed: ${error}`);
    }
  }
  
  private importConfig() {
    const importPath = path.join(process.env.HOME || "/root", ".memphis", "tui-config-export.json");
    
    try {
      if (!fs.existsSync(importPath)) {
        this.addSystemMessage(`✗ No export file found at: ${importPath}`);
        return;
      }
      
      const data = JSON.parse(fs.readFileSync(importPath, "utf8"));
      
      // Apply imported config
      this.config = { ...this.config, ...data };
      this.theme = this.config.theme === 'dark' ? DARK_THEME : LIGHT_THEME;
      this.showJournalSidebar = this.config.sidebarEnabled;
      
      if (data.commandHistory) {
        this.commandHistory = data.commandHistory;
      }
      
      // Save to main config
      saveTUIConfig(this.config);
      
      this.addSystemMessage(`✓ Config imported from: ${importPath}`);
      this.addSystemMessage(`  Theme: ${this.theme.mode} | Sidebar: ${this.showJournalSidebar ? 'on' : 'off'} | History: ${this.commandHistory.length} items`);
      
      this.updateChatBox();
    } catch (error) {
      this.addSystemMessage(`✗ Import failed: ${error}`);
    }
  }
  
  private showConfig() {
    const configInfo = `
${chalk.bold(this.theme.primary("TUI Configuration"))}

${this.theme.warning("Theme:")} ${this.theme.mode}
${this.theme.warning("Sidebar:")} ${this.config.sidebarEnabled ? 'enabled' : 'disabled'} (${this.config.sidebarWidth}% width)
${this.theme.warning("History Size:")} ${this.config.maxHistorySize} commands

${this.theme.warning("Keybindings:")}
  Quick Journal: ${this.config.keybindings.quickJournal}
  Search:        ${this.config.keybindings.search}
  Toggle Sidebar: ${this.config.keybindings.toggleSidebar}
  Toggle Theme:  ${this.config.keybindings.toggleTheme}

${this.theme.muted("Commands: /export-config, /import-config, /reset-config")}
`;
    this.addSystemMessage(configInfo);
  }
  
  private resetConfig() {
    this.config = DEFAULT_TUI_CONFIG;
    this.theme = DARK_THEME;
    this.showJournalSidebar = false;
    
    saveTUIConfig(this.config);
    
    this.addSystemMessage("✓ Config reset to defaults");
    this.updateChatBox();
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
      : "Ctrl+J journal Ctrl+R search [q] quit";
    
    // Theme indicator
    const themeIcon = this.theme.mode === 'dark' ? "🌙" : "☀️";
    const themeStr = `${themeIcon}`;
    
    // Sidebar indicator
    const sidebarStr = this.showJournalSidebar ? "📖" : "";
    
    // Compose status bar
    const parts = [
      chainStr,
      lastActivity,
      providerStr,
      intelStr,
      suggestionStr,
      syncStr,
      sidebarStr,
      themeStr,
      this.theme.muted(hints),
      this.theme.muted(`⏱️ ${this.formatTime(new Date())}`)
    ].filter(p => p); // Remove empty parts
    
    return parts.join(" │ ");
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
  }

  private handleInput(text: string) {
    if (!text.trim()) return;
    
    // Phase 4: Add to command history
    this.addToCommandHistory(text);

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
        this.showHelp();
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
      case "/theme":
        this.toggleTheme();
        break;
      case "/sidebar":
        this.toggleJournalSidebar();
        break;
      case "/history":
        this.showHistory();
        break;
      case "/config":
        this.showConfig();
        break;
      case "/export-config":
        this.exportConfig();
        break;
      case "/import-config":
        this.importConfig();
        break;
      case "/reset-config":
        this.resetConfig();
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
  
  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE 4: HELP SYSTEM
  // ─────────────────────────────────────────────────────────────────────────────
  
  private showHelp() {
    const helpText = `
${chalk.bold(this.theme.primary("Memphis Nexus TUI - Help"))}

${this.theme.warning("Keyboard Shortcuts:")}
  Ctrl+J  Quick journal entry
  Ctrl+R  Search/Recall memories
  Ctrl+S  Toggle journal sidebar
  Ctrl+T  Toggle theme (dark/light)
  Tab     Autocomplete commands
  ↑/↓     Command history
  q       Quit

${this.theme.warning("Commands:")}
  /j <text>       Quick journal entry
  /a <question>   Ask Memphis
  /d <decision>   Record a decision
  /search <query> Search memories
  /recall <query> Recall from chains
  /s <query>      Short search alias
  /sync           Show network sync status
  /theme          Toggle theme (dark/light)
  /sidebar        Toggle journal sidebar
  /history        Show command history
  /config         Show TUI configuration
  /export-config  Export config to file
  /import-config  Import config from file
  /reset-config   Reset to defaults
  /clear          Clear chat
  /status         Show system status
  /help           Show this help
  /quit           Exit TUI

${this.theme.muted("Theme: " + this.theme.mode + " mode | Sidebar: " + (this.showJournalSidebar ? "on" : "off"))}
`;
    this.addSystemMessage(helpText);
  }
  
  private showHistory() {
    if (this.commandHistory.length === 0) {
      this.addSystemMessage("No command history yet");
      return;
    }
    
    const recent = this.commandHistory.slice(-10).reverse();
    let historyText = chalk.bold(this.theme.primary("Command History (last 10):\n\n"));
    recent.forEach((cmd, i) => {
      historyText += `  ${this.theme.muted(String(i + 1))}  ${cmd}\n`;
    });
    this.addSystemMessage(historyText);
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
