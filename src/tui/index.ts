#!/usr/bin/env node
import blessed from "blessed";
import { Store } from "../memory/store.js";
import { loadConfig } from "../config/loader.js";
import { queryBlocks } from "../memory/query.js";
import { encrypt, decrypt } from "../utils/crypto.js";
import { OpenClawBridge } from "../bridges/openclaw.js";
import { OllamaProvider } from "../providers/ollama.js";
import type { LLMMessage } from "../providers/index.js";
import { OllamaProvider } from "../providers/ollama.js";
import { OpenAIProvider } from "../providers/openai.js";
import type { LLMMessage } from "../providers/index.js";

// Colors
const COLORS = {
  primary: "cyan",
  secondary: "magenta",
  success: "green",
  warning: "yellow",
  error: "red",
  text: "white",
  muted: "gray",
  bg: "black",
};

export class MemphisTUI {
  private screen: blessed.Widgets.Screen;
  private store: Store;
  private config: ReturnType<typeof loadConfig>;
  private openclawBridge: OpenClawBridge;
  private llmProvider: any = null;
  private llmProviderName: string = "";
  private currentScreen: string = "dashboard";
  private inputMode: string = "";

  // UI Elements
  private headerBox: blessed.Widgets.BoxElement;
  private sidebarBox: blessed.Widgets.BoxElement;
  private contentBox: blessed.Widgets.BoxElement;
  private inputBox: blessed.Widgets.BoxElement;
  private inputField: blessed.Widgets.TextboxElement;
  private statusBar: blessed.Widgets.BoxElement;

  constructor() {
    // Initialize store and config
    const config = loadConfig();
    this.config = config;
    this.store = new Store(config.memory?.path || `${process.env.HOME}/.memphis/chains`);
    
    // Initialize OpenClaw bridge
    this.openclawBridge = new OpenClawBridge();
    
    // Initialize LLM provider (Ollama first, then OpenAI)
    this.initLLM();

    // Create screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: "Memphis - AI Brain",
      fullUnicode: true,
    });

    // Create header
    this.headerBox = blessed.box({
      top: 0,
      left: 0,
      width: "100%",
      height: 3,
      style: {
        fg: COLORS.text,
        bg: COLORS.primary,
        bold: true,
      },
      content: `{center}{bold} Memphis - Local-first AI Brain{/bold}{/center}`,
    });

    // Create sidebar
    this.sidebarBox = blessed.box({
      top: 3,
      left: 0,
      width: "25%",
      height: "90%",
      style: {
        fg: COLORS.text,
        bg: "black",
        border: { fg: COLORS.primary },
      },
      tags: true,
      content: this.getSidebarContent(),
    });

    // Create content area
    this.contentBox = blessed.box({
      top: 3,
      left: "25%",
      width: "75%",
      height: "90%",
      style: {
        fg: COLORS.text,
        bg: "black",
        border: { fg: COLORS.primary },
      },
      tags: true,
      scrollable: true,
      content: "",
    });

    // Create input area
    this.inputBox = blessed.box({
      bottom: 2,
      left: 0,
      width: "100%",
      height: 3,
      style: {
        fg: COLORS.text,
        bg: "black",
        border: { fg: COLORS.secondary },
      },
      visible: false,
    });

    this.inputField = blessed.textbox({
      parent: this.inputBox,
      top: 0,
      left: 1,
      width: "98%",
      height: 1,
      style: {
        fg: COLORS.text,
        bg: "black",
      },
      placeholder: "Type your input...",
    });

    // Create status bar
    this.statusBar = blessed.box({
      bottom: 0,
      left: 0,
      width: "100%",
      height: 1,
      style: {
        fg: COLORS.text,
        bg: COLORS.secondary,
      },
      content: "Press 'q' to quit | Arrow keys to navigate | Enter to select",
    });

    // Append all elements
    this.screen.append(this.headerBox);
    this.screen.append(this.sidebarBox);
    this.screen.append(this.contentBox);
    this.screen.append(this.inputBox);
    this.screen.append(this.statusBar);

    // Key bindings
    this.screen.key(["escape", "q", "C-c"], () => {
      process.exit(0);
    });

    // Arrow key navigation
    this.screen.key(["up", "down"], (ch: string, key: { name: string }) => {
      this.handleNavigation(key.name);
    });

    this.screen.key(["enter"], () => {
      this.handleEnter();
    });

    // Number key navigation
    this.screen.key(["1", "2", "3", "4", "5", "6", "7"], (ch: string) => {
      this.navigateToMenu(parseInt(ch));
    });

    // Also allow j/k for vim-style navigation
    this.screen.key(["j", "k"], (ch: string) => {
      if (ch === "j") this.handleNavigation("down");
      else this.handleNavigation("up");
    });

    // Render initial screen
    this.renderDashboard();
    this.screen.render();
  }

  private handleNavigation(direction: string): void {
    const menuItems = ["dashboard", "journal", "vault", "recall", "ask", "openclaw", "settings"];
    const currentIndex = menuItems.indexOf(this.currentScreen);
    
    let newIndex = currentIndex;
    if (direction === "down") newIndex = Math.min(currentIndex + 1, menuItems.length - 1);
    if (direction === "up") newIndex = Math.max(currentIndex - 1, 0);
    
    if (newIndex !== currentIndex) {
      this.navigateToMenu(newIndex + 1);
    }
  }

  private handleEnter(): void {
    // Handle enter - just re-render current screen to activate input
    this.navigateToMenu(this.getCurrentMenuIndex());
  }
  
  private getCurrentMenuIndex(): number {
    const menuMap: Record<string, number> = {
      dashboard: 1,
      journal: 2,
      vault: 3,
      recall: 4,
      ask: 5,
      openclaw: 6,
      settings: 7
    };
    return menuMap[this.currentScreen] || 1;
  }

  private getSidebarContent(): string {
    const menuItems = [
      " Dashboard",
      " Journal",
      " Vault",
      " Recall",
      " Ask",
      " OpenClaw",
      " Settings",
    ];

    let content = "{bold}Navigation{/bold}\n\n";
    menuItems.forEach((item, index) => {
      const prefix = this.currentScreen === item.toLowerCase().slice(1) 
        ? "> " 
        : "  ";
      content += `${prefix}${item}\n`;
    });

    content += "\n\n{bold}Quick Stats{/bold}\n";
    const chains = this.store.listChains();
    content += `Chains: ${chains.length}\n`;
    chains.forEach((chain) => {
      const stats = this.store.getChainStats(chain);
      content += `  - ${chain}: ${stats.blocks} blocks\n`;
    });

    return content;
  }

  private renderDashboard(): void {
    this.currentScreen = "dashboard";
    const chains = this.store.listChains();

    let content = `{bold}{cyan} Dashboard{/cyan}{/bold}\n\n`;
    content += `Welcome to Memphis! Your local-first AI brain.\n\n`;

    if (chains.length === 0) {
      content += `{yellow}No memory chains yet. Start by adding a journal entry!{/yellow}\n`;
    } else {
      content += `{bold}Memory Chains:{/bold}\n\n`;
      chains.forEach((chain) => {
        const stats = this.store.getChainStats(chain);
        content += `{cyan}> ${chain}{/cyan}\n`;
        content += `    Blocks: ${stats.blocks}\n`;
        content += `    First: ${stats.first || "N/A"}\n`;
        content += `    Last: ${stats.last || "N/A"}\n\n`;
      });
    }

    content += `\n{bold}Recent Activity:{/bold}\n`;
    chains.slice(0, 3).forEach((chain) => {
      const blocks = this.store.readChain(chain);
      if (blocks.length > 0) {
        const lastBlock = blocks[blocks.length - 1];
        content += `  * ${chain}: ${lastBlock.data?.content?.substring(0, 50)}...\n`;
      }
    });

    this.contentBox.setContent(content);
    this.sidebarBox.setContent(this.getSidebarContent());
  }

  private navigateToMenu(num: number): void {
    switch (num) {
      case 1:
        this.renderDashboard();
        break;
      case 2:
        this.renderJournal();
        break;
      case 3:
        this.renderVault();
        break;
      case 4:
        this.renderRecall();
        break;
      case 5:
        this.renderAsk();
        break;
      case 6:
        this.renderOpenClaw();
        break;
      case 7:
        this.renderSettings();
        break;
    }
    this.screen.render();
  }

  private renderJournal(): void {
    this.currentScreen = "journal";
    let content = `{bold}{cyan} Journal Entry{/cyan}{/bold}\n\n`;
    content += `Add a new entry to your memory.\n\n`;
    content += `{white}Press Enter to start typing your journal entry...{/white}\n`;
    this.contentBox.setContent(content);
    this.sidebarBox.setContent(this.getSidebarContent());

    // Show input after a brief delay
    setTimeout(() => {
      this.inputMode = "journal";
      this.inputBox.show();
      (this.inputField.options as any).placeholder = "What's on your mind?";
      this.inputField.focus();
      this.inputField.readInput((err: any, value: any) => {
        if (value && value.trim()) {
          this.store.addBlock("journal", {
            type: "journal",
            content: value.trim(),
            tags: [],
          });
          this.contentBox.setContent(`{green} Entry added successfully!{/green}\n\nPress any key to return to dashboard...`);
        }
        this.inputMode = "";
        this.inputBox.hide();
        this.screen.render();
      });
    }, 100);
  }

  private renderRecall(): void {
    this.currentScreen = "recall";
    let content = `{bold}{cyan} Recall - Search Memory{/cyan}{/bold}\n\n`;
    content += `Search through your memory chains.\n\n`;
    content += `{white}Press Enter to search...{/white}\n`;
    this.contentBox.setContent(content);
    this.sidebarBox.setContent(this.getSidebarContent());

    setTimeout(() => {
      this.inputMode = "recall";
      this.inputBox.show();
      (this.inputField.options as any).placeholder = "Enter keyword to search...";
      this.inputField.focus();
      this.inputField.readInput((err: any, value: any) => {
        if (value && value.trim()) {
          const results = queryBlocks(this.store, { keyword: value.trim() });
          let resultContent = `{bold}Search Results for "${value.trim()}":{/bold}\n\n`;
          if (results.length === 0) {
            resultContent += `{yellow}No results found.{/yellow}\n`;
          } else {
            results.forEach((block: any, index: number) => {
              resultContent += `{cyan}${index + 1}. ${block.chain}{/cyan}\n`;
              resultContent += `   ${block.data?.content?.substring(0, 100)}...\n`;
              resultContent += `   ${block.timestamp}\n\n`;
            });
          }
          resultContent += `\n{white}Press any key to continue...{/white}`;
          this.contentBox.setContent(resultContent);
        }
        this.inputMode = "";
        this.inputBox.hide();
        this.screen.render();
      });
    }, 100);
  }

  private renderAsk(): void {
    this.currentScreen = "ask";
    let content = `{bold}{cyan} Ask Memphis{/cyan}{/bold}\n\n`;
    content += `Ask a question about your memory.\n\n`;
    content += `{white}Press Enter to ask...{/white}\n`;
    this.contentBox.setContent(content);
    this.sidebarBox.setContent(this.getSidebarContent());

    setTimeout(() => {
      this.inputMode = "ask";
      this.inputBox.show();
      (this.inputField.options as any).placeholder = "What would you like to know?";
      this.inputField.focus();
      this.inputField.readInput(async (err: any, value: any) => {
        if (value && value.trim()) {
          this.contentBox.setContent(`{bold}Thinking...{/bold}\n`);
          this.screen.render();
          
          const answer = await this.askLLM(value.trim());
          
          let responseContent = `{bold}Question: "${value.trim()}"{/bold}\n\n`;
          responseContent += `{white}Answer:{/white}\n\n${answer}\n\n`;
          responseContent += `{gray}Provider: ${this.llmProviderName}{/gray}\n\n`;
          responseContent += `{white}Press any key to continue...{/white}`;
          this.contentBox.setContent(responseContent);
        }
        this.inputMode = "";
        this.inputBox.hide();
        this.screen.render();
      });
    }, 100);
  }

  private initLLM(): void {
    // Try Ollama first (local, free)
    const ollamaConfig = this.config.providers?.ollama;
    if (ollamaConfig) {
      this.llmProvider = new OllamaProvider();
      this.llmProviderName = "Ollama";
      if (this.llmProvider.isConfigured()) {
        console.log("🤖 TUI: Using Ollama for LLM");
        return;
      }
    }
    
    // Try OpenAI
    const openaiConfig = this.config.providers?.openai;
    if (openaiConfig?.api_key || process.env.OPENAI_API_KEY) {
      this.llmProvider = new OpenAIProvider();
      this.llmProviderName = "OpenAI";
      if (this.llmProvider.isConfigured()) {
        console.log("🤖 TUI: Using OpenAI for LLM");
        return;
      }
    }
    
    console.log("⚠️ TUI: No LLM provider configured");
  }
  
  private async askLLM(question: string): Promise<string> {
    if (!this.llmProvider || !this.llmProvider.isConfigured()) {
      return "No LLM provider configured. Please set up Ollama or OpenAI.";
    }
    
    // Get memory context
    const results = queryBlocks(this.store, { keyword: question, limit: 5 });
    const context = results.map((b: any) => b.data?.content).join("\n");
    
    const messages: LLMMessage[] = [
      {
        role: "system",
        content: "You are Memphis, a helpful AI assistant. Be concise and friendly.",
      },
    ];
    
    if (context) {
      messages.push({
        role: "system",
        content: `Relevant memory:\n${context}`,
      });
    }
    
    messages.push({
      role: "user",
      content: question,
    });
    
    try {
      const response = await this.llmProvider.chat(messages, {
        model: this.config.providers?.ollama?.model || this.config.providers?.openai?.model || "llama3.2:1b",
      });
      return response.content;
    } catch (err) {
      return `Error: ${err}`;
    }
  }

  private renderSettings(): void {
    this.currentScreen = "settings";
    let content = `{bold}{cyan} Settings{/cyan}{/bold}\n\n`;
    content += `{white}Configuration:{/white}\n\n`;
    content += `Storage Path: ${this.config.memory?.path || "~/.memphis/chains"}\n`;
    content += `Providers: ${Object.keys(this.config.providers || {}).length}\n\n`;
    content += `{yellow}Settings editor coming soon!{/yellow}\n`;
    this.contentBox.setContent(content);
    this.sidebarBox.setContent(this.getSidebarContent());
  }

  private renderVault(): void {
    this.currentScreen = "vault";
    let content = `{bold}{cyan} Vault - Encrypted Secrets{/cyan}{/bold}\n\n`;
    content += `Secure storage for API keys and secrets.\n\n`;
    content += `{white}Press Enter to add a new secret...{/white}\n`;
    this.contentBox.setContent(content);
    this.sidebarBox.setContent(this.getSidebarContent());

    setTimeout(() => {
      this.inputMode = "vault_add";
      this.inputBox.show();
      (this.inputField.options as any).placeholder = "Secret name (e.g. openrouter):";
      this.inputField.focus();
      this.inputField.readInput((err: any, keyName: any) => {
        if (keyName && keyName.trim()) {
          // Now ask for value
          this.inputField.setValue("");
          (this.inputField.options as any).placeholder = "Secret value:";
          this.inputField.readInput((err2: any, secretValue: any) => {
            if (secretValue && secretValue.trim()) {
              // Now ask for password
              this.inputField.setValue("");
              (this.inputField.options as any).placeholder = "Master password:";
              this.inputField.readInput((err3: any, password: any) => {
                if (password && password.trim()) {
                  const encrypted = encrypt(secretValue.trim(), password.trim());
                  this.store.addBlock("vault", {
                    type: "vault",
                    content: keyName.trim(),
                    tags: ["secret", keyName.trim()],
                    encrypted,
                    iv: encrypted.substring(0, 24),
                    key_id: keyName.trim(),
                  });
                  this.contentBox.setContent(`{green} Secret "${keyName.trim()}" added successfully!{/green}\n\nPress any key to return...`);
                }
                this.inputMode = "";
                this.inputBox.hide();
                this.screen.render();
              });
            } else {
              this.inputMode = "";
              this.inputBox.hide();
              this.screen.render();
            }
          });
        } else {
          this.inputMode = "";
          this.inputBox.hide();
          this.screen.render();
        }
      });
    }, 100);
  }

  private renderOpenClaw(): void {
    this.currentScreen = "openclaw";
    
    // Get real bridge data
    const agents = this.openclawBridge.getAgents();
    const messages = this.openclawBridge.getMessages();
    const status = this.openclawBridge.getStatus();
    
    let content = `{bold}{cyan} 🦞 OpenClaw - Agent Collaboration{/cyan}{/bold}\n\n`;
    content += `{white}Bridge Status:{/white}\n`;
    content += `  Connected Agents: ${agents.length}\n`;
    content += `  Messages Exchanged: ${messages.length}\n\n`;
    
    // List agents
    content += `{bold}Connected Agents:{/bold}\n`;
    if (agents.length === 0) {
      content += `  {yellow}No agents connected.{/yellow}\n`;
    } else {
      agents.forEach(agent => {
        content += `  {cyan}• ${agent.name}{/cyan}\n`;
        content += `    Status: ${agent.status}\n`;
        content += `    Compute Share: ${agent.computeShare}%\n`;
        content += `    Capabilities: ${agent.capabilities.join(", ")}\n`;
        content += `    DID: ${agent.did.substring(0, 30)}...\n\n`;
      });
    }
    
    // Recent messages
    if (messages.length > 0) {
      content += `{bold}Recent Messages:{/bold}\n`;
      messages.slice(-3).forEach(msg => {
        content += `  ${msg.from} → ${msg.to}: ${msg.content.substring(0, 40)}...\n`;
      });
    }
    
    content += `\n{white}Press Enter to send a message to agents...{/white}\n`;
    content += `{gray}(Or press 'n' to negotiate compute share){/gray}\n`;
    content += `{gray}(Or press 'r' to read journal logs){/gray}\n`;
    
    this.contentBox.setContent(content);
    this.sidebarBox.setContent(this.getSidebarContent());

    setTimeout(() => {
      this.inputMode = "openclaw_menu";
      this.inputBox.show();
      (this.inputField.options as any).placeholder = "Press Enter=message, 'n'=negotiate, 'r'=read logs:";
      this.inputField.focus();
      this.inputField.readInput((err: any, value: any) => {
        if (value && value.trim()) {
          const input = value.trim().toLowerCase();
          
          if (input === 'n') {
            // Negotiate compute share
            this.inputField.setValue("");
            (this.inputField.options as any).placeholder = "Enter compute share % (e.g. 40):";
            this.inputField.readInput((err2: any, shareValue: any) => {
              if (shareValue && shareValue.trim()) {
                const share = parseInt(shareValue.trim());
                const success = this.openclawBridge.negotiateComputeShare("openclaw-001", share);
                const updatedAgents = this.openclawBridge.getAgents();
                const agent = updatedAgents.find(a => a.id === "openclaw-001");
                this.contentBox.setContent(success 
                  ? `{green}✅ Compute share negotiated!{/green}\n\nNew share: ${agent?.computeShare}%\n\n{white}Press any key to continue...{/white}`
                  : `{red}❌ Negotiation failed{/red}\n\n{white}Press any key to continue...{/white}`);
              }
              this.inputMode = "";
              this.inputBox.hide();
              this.screen.render();
            });
          } else if (input === 'r') {
            // Read journal logs
            const logs = this.store.readChain("journal");
            const recentLogs = logs.slice(-20).reverse();
            
            let logContent = `{bold}{cyan}📜 Journal Logs (ostatnie 20){/cyan}{/bold}\n\n`;
            
            if (recentLogs.length === 0) {
              logContent += `{yellow}Brak wpisów w dzienniku.{/yellow}\n`;
            } else {
              recentLogs.forEach((block: any, index: number) => {
                logContent += `{cyan}[${block.index}]{/cyan} ${block.timestamp}\n`;
                logContent += `   ${block.data?.content?.substring(0, 80)}...\n\n`;
              });
            }
            
            logContent += `\n{white}Press any key to wrócić...{/white}`;
            this.contentBox.setContent(logContent);
            this.inputMode = "";
            this.inputBox.hide();
            this.screen.render();
          } else {
            // Send message via bridge
            this.openclawBridge.sendMessage("openclaw-001", value.trim()).then(response => {
              this.contentBox.setContent(`{bold}Sent: "${value.trim()}"{/bold}\n\n{cyan}Agent Response:{/cyan}\n\n${response.content}\n\n{white}Press any key to continue...{/white}`);
              this.inputMode = "";
              this.inputBox.hide();
              this.screen.render();
            });
          }
        } else {
          this.inputMode = "";
          this.inputBox.hide();
          this.screen.render();
        }
      });
    }, 100);
  }

  public run(): void {
    this.screen.render();
  }
}

// Run the TUI
const tui = new MemphisTUI();
tui.run();
