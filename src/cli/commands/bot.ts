import chalk from "chalk";
import { spawn } from "child_process";
import { promisify } from "util";
import { exec } from "child_process";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const execAsync = promisify(exec);

// Logger setup
const LOG_DIR = process.env.LOG_DIR || "/tmp";
const LOG_FILE = `${LOG_DIR}/memphis-bot.log`;
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB

function getLogger() {
  const logDir = dirname(LOG_FILE);
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true });
  }
  
  // Simple log rotation: check file size
  let stream;
  try {
    const stats = require('node:fs').statSync(LOG_FILE);
    if (stats.size > MAX_LOG_SIZE) {
      // Rename old log
      const rotated = `${LOG_FILE}.${Date.now()}`;
      require('node:fs').renameSync(LOG_FILE, rotated);
    }
  } catch {}
  
  stream = createWriteStream(LOG_FILE, { flags: "a" });
  
  return {
    info: (msg: string) => {
      const line = `[${new Date().toISOString()}] INFO: ${msg}\n`;
      process.stderr.write(line);
      stream.write(line);
    },
    error: (msg: string, err?: any) => {
      const line = `[${new Date().toISOString()}] ERROR: ${msg}${err ? ` - ${err}` : ''}\n`;
      process.stderr.write(line);
      stream.write(line);
    },
    close: () => stream.end()
  };
}

const logger = getLogger();

interface TelegramUpdate {
  update_id: number;
  message?: {
    from: { id: number; first_name?: string };
    text: string;
    chat: { id: number };
  };
}

import { get } from "node:https";

// Use https module instead of fetch (more reliable on WSL2)
function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = get(url, {
      headers: {
        'Connection': 'close'
      }
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

class MemphisBot {
  private token: string;
  private apiUrl: string;
  private offset: number = 0;
  private stopped: boolean = false;
  private attempt: number = 0;
  private readonly MAX_ATTEMPTS = 10;
  private readonly BASE_BACKOFF_MS = 2000;
  private readonly MAX_BACKOFF_MS = 120000; // 2 min
  private ownerId: number;

  constructor(token: string) {
    this.token = token;
    this.apiUrl = `https://api.telegram.org/bot${token}`;
    // Owner ID from env (your Telegram user_id)
    this.ownerId = parseInt(process.env.TELEGRAM_OWNER_ID || "0");
  }

  private isOwner(userId: number): boolean {
    // If no owner set, allow all (dev mode)
    if (!this.ownerId) return true;
    return userId === this.ownerId;
  }

  // Exponential backoff with jitter
  private backoffMs(attempt: number): number {
    const exp = Math.min(attempt, 7); // max 2^7 = 128
    const base = this.BASE_BACKOFF_MS * Math.pow(2, exp);
    const jitter = Math.random() * 0.3 * base; // 0-30% jitter
    return Math.min(base + jitter, this.MAX_BACKOFF_MS);
  }

  async start() {
    logger.info("🤖 Memphis Bot starting...");
    
    // Setup graceful shutdown
    this.setupSignalHandlers();
    
    console.log(chalk.green("✅ Bot is running!"));
    console.log(chalk.gray("Send /help to the bot on Telegram"));
    
    // Main loop with auto-restart
    while (!this.stopped) {
      try {
        this.attempt = 0;
        await this.poll();
      } catch (e: any) {
        if (this.stopped) {
          logger.info("Bot stopped gracefully");
          break;
        }
        
        this.attempt++;
        const waitMs = this.backoffMs(this.attempt);
        
        logger.error("Bot crashed in poll(), retrying", e.message || e);
        logger.info(`Backoff ${this.attempt}: waiting ${Math.round(waitMs/1000)}s...`);
        
        // Degraded mode: never stop, just keep retrying with longer backoff
        // User can manually stop with SIGTERM if needed
        
        await new Promise(r => setTimeout(r, waitMs));
      }
    }
    
    logger.info("Bot loop exited");
    logger.close();
    process.exit(0);
  }

  private setupSignalHandlers() {
    const shutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      this.stopped = true;
    };
    
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  }

  private async poll() {
    logger.info("Poll: starting loop");
    while (!this.stopped) {
      try {
        logger.info(`Poll: fetching (offset=${this.offset})`);
        const responseText = await httpsGet(`${this.apiUrl}/getUpdates?timeout=10&offset=${this.offset}`);
        
        // Debug: log raw response
        if (responseText.length < 100) {
          logger.info(`Poll raw: ${responseText}`);
        } else {
          logger.info(`Poll raw (first 200): ${responseText.substring(0, 200)}`);
        }
        
        const response = { ok: true, status: 200 }; // Mock response for logging
        logger.info(`Poll: got response ${response.status}`);
        
        if (!response.ok) {
          logger.error(`Telegram API error: ${response.status}`);
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }
        
        let data: { ok: boolean; result?: TelegramUpdate[]; error_code?: number; description?: string };
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          logger.error(`Failed to parse response: ${responseText.substring(0, 100)}`);
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }
        
        if (!data.ok || data.error_code === 409) {
          logger.error(`Telegram API error: ${data.error_code || 'unknown'} - ${data.description || ''}`);
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }
        
        logger.info(`Poll: raw response length ${responseText.length}`);
        logger.info(`Poll: got ${data.result?.length || 0} updates`);
        
        if (!data.result || data.result.length === 0) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        
        for (const update of data.result) {
          logger.info(`Processing update ${update.update_id}: ${update.message?.text}`);
          this.offset = update.update_id + 1;
          
          if (update.message?.text && update.message.from) {
            await this.handleMessage(
              update.message.text, 
              update.message.chat.id,
              update.message.from.id
            );
          }
        }
      } catch (e: any) {
        // Don't throw on poll errors - just log and continue
        logger.error("Poll error", e.message || e);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  private async runMemphis(args: string[]): Promise<string> {
    return new Promise((resolve) => {
      const proc = spawn("memphis", args, {
        stdio: ["pipe", "pipe", "pipe"]
      });
      
      let stdout = "";
      let stderr = "";
      
      proc.stdout.on("data", (data) => { stdout += data.toString(); });
      proc.stderr.on("data", (data) => { stderr += data.toString(); });
      
      proc.on("close", (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          resolve(stderr || `Error: ${code}`);
        }
      });
      
      proc.on("error", (err) => {
        resolve(`Error: ${err.message}`);
      });
    });
  }

  private async handleMessage(text: string, chatId: number, userId: number) {
    console.log(`[HANDLE] text="${text}" chatId=${chatId} userId=${userId}`);
    // Owner check
    if (!this.isOwner(userId)) {
      logger.info(`Rejected message from unknown user ${userId}`);
      return;
    }
    
    const trimmed = text.trim();
    
    // If doesn't start with /, treat as a question to Memphis (chat mode!)
    if (!trimmed.startsWith("/")) {
      await this.sendMessage(chatId, `🤔 ${trimmed}...`);
      const answer = await this.runMemphis(["ask", trimmed]);
      await this.sendMessage(chatId, this.truncate(answer, 4000));
      return;
    }
    
    const [cmd, ...args] = trimmed.split(" ");
    const arg = args.join(" ");

    try {
      switch (cmd.toLowerCase()) {
        case "/start":
        case "/help":
          await this.sendMessage(chatId, 
            "🤖 *MemphisBrain_bot*\n" +
            "━━━━━━━━━━━━━━━━━━━━\n\n" +
            "📋 *Komendy:*\n" +
            "/ping – Status & uptime\n" +
            "/status – Status łańcuchów\n" +
            "/summary – Ostatnie summary\n" +
            "/decisions – Lista decyzji\n" +
            "/restart – Restart bota\n\n" +
            "🔗 *Więcej:*\n" +
            "/ask [pytanie] – Zapytaj Memphis\n" +
            "/journal [tekst] – Dodaj wpis\n" +
            "/recall [słowo] – Szukaj w pamięci\n" +
            "/decide [tytuł] [wybór] – Zapisz decyzję\n\n" +
            "━━━━━━━━━━━━━━━━━━━━\n" +
            `Bot: @MemphisBrain_bot\n` +
            `Owner: ${this.ownerId || 'dev mode'}`
          );
          break;
          
        case "/status":
          await this.sendMessage(chatId, "📊 Sprawdzam...");
          const status = await this.runMemphis(["status"]);
          await this.sendMessage(chatId, this.truncate(status, 4000));
          break;
          
        case "/ask":
          if (!arg) {
            await this.sendMessage(chatId, "❓ Użyj: /ask [pytanie]");
            return;
          }
          await this.sendMessage(chatId, `🤔 ${arg}...`);
          const answer = await this.runMemphis(["ask", arg]);
          await this.sendMessage(chatId, this.truncate(answer, 4000));
          break;
          
        case "/journal":
          if (!arg) {
            await this.sendMessage(chatId, "❓ Użyj: /journal [tekst]");
            return;
          }
          const journalResult = await this.runMemphis(["journal", arg]);
          await this.sendMessage(chatId, this.truncate(journalResult, 4000));
          break;
          
        case "/recall":
          if (!arg) {
            await this.sendMessage(chatId, "❓ Użyj: /recall [słowo]");
            return;
          }
          await this.sendMessage(chatId, `🔍 Szukam: ${arg}...`);
          const recallResult = await this.runMemphis(["recall", arg, "--limit", "5"]);
          await this.sendMessage(chatId, this.truncate(recallResult, 4000));
          break;
          
        case "/decide":
          // Format: /decide "title" "chosen"
          const parts = (arg.match(/(?:[^\s"]+|"[^"]*")+/g) || []);
          if (parts.length < 2 || !parts[0] || !parts[1]) {
            await this.sendMessage(chatId, "❓ Użyj: /decide [tytuł] [wybór]");
            return;
          }
          const title = parts[0].replace(/"/g, "");
          const chosen = parts.slice(1).join(" ").replace(/"/g, "");
          await this.sendMessage(chatId, `📝 Decyzja: ${title} → ${chosen}`);
          const decideResult = await this.runMemphis(["decide", title, chosen]);
          await this.sendMessage(chatId, this.truncate(decideResult, 4000));
          break;
          
        case "/last":
          const lastResult = await this.runMemphis(["recall", "", "--limit", "3"]);
          await this.sendMessage(chatId, this.truncate(lastResult, 4000));
          break;
          
        case "/restart":
          await this.sendMessage(chatId, "🔄 Restartuję bota...");
          this.stopped = true;
          break;
          
        case "/whoami":
          await this.sendMessage(chatId, 
            `🤖 *Bot Identity*\n\n` +
            `Bot: @MemphisBrain_bot\n` +
            `Chat ID: ${chatId}\n` +
            `User ID: ${userId}\n` +
            `Owner OK: ${this.isOwner(userId) ? '✅ Tak' : '❌ Nie'}\n` +
            `Version: Memphis Bot v1.2`
          );
          break;
          
        case "/ping":
          const uptime = process.uptime();
          const minutes = Math.floor(uptime / 60);
          await this.sendMessage(chatId, `🏓 *Pong!*\n\n✅ Bot działa!\n⏱️ Uptime: ${minutes} min\n🔐 Owner: ${this.ownerId || 'dev mode'}`);
          break;
          
        case "/status":
          try {
            const status = await this.runMemphis(["status"]);
            // Format: short + readable
            const lines = status.split('\n').filter(l => 
              l.includes('⛓') || l.includes('provider') || l.includes('ollama') || l.includes('Vault')
            ).slice(0, 8);
            await this.sendMessage(chatId, "📊 *Status*\n\n" + lines.join('\n'));
          } catch (e) {
            await this.sendMessage(chatId, `❌ Błąd: ${e}`);
          }
          break;
          
        case "/summary":
          try {
            // Get last 2 summaries
            const summary = await this.runMemphis(["recall", "summary", "--limit", "1"]);
            if (summary && summary.length > 20) {
              // Take first 15 lines max
              const short = summary.split('\n').slice(0, 15).join('\n');
              await this.sendMessage(chatId, "📝 *Ostatnie Summary*\n\n" + this.truncate(short, 3500));
            } else {
              await this.sendMessage(chatId, "📝 *Brak summary*\n\nUżyj `memphis summarize --force` w CLI.");
            }
          } catch (e) {
            await this.sendMessage(chatId, `❌ Błąd: ${e}`);
          }
          break;
          
        case "/decisions":
          try {
            const decisions = await this.runMemphis(["recall", "--chain", "decision", "--limit", "3"]);
            if (decisions && decisions.length > 20) {
              const short = decisions.split('\n').filter(l => l.includes('title') || l.includes('chosen') || l.includes('---')).slice(0, 10).join('\n');
              await this.sendMessage(chatId, "📋 *Ostatnie Decyzje*\n\n" + this.truncate(short || decisions, 3500));
            } else {
              await this.sendMessage(chatId, "📋 *Brak decyzji*");
            }
          } catch (e) {
            await this.sendMessage(chatId, `❌ Błąd: ${e}`);
          }
          break;
          
        default:
          await this.sendMessage(chatId, "❓ Nieznana komenda. Użyj /help");
      }
    } catch (e) {
      await this.sendMessage(chatId, `❌ Błąd: ${e}`);
    }
  }

  private truncate(text: string, max: number): string {
    if (!text) return "(pusta odpowiedź)";
    if (text.length <= max) return text;
    return text.substring(0, max - 100) + "\n\n...(więcej)";
  }

  private async sendMessage(chatId: number, text: string) {
    if (chatId === 0) return;
    
    try {
      const response = await fetch(`${this.apiUrl}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          chat_id: chatId, 
          text,
          parse_mode: "Markdown"
        })
      });
      const result = await response.json();
      logger.info(`Sent message to ${chatId}: ${result.ok ? 'OK' : 'FAILED'}`);
    } catch (e) {
      logger.error("Send error", e);
    }
  }
}

export async function botCommand(action?: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!token) {
    console.log(chalk.red("❌ No bot token!"));
    console.log(chalk.gray("Set TELEGRAM_BOT_TOKEN env"));
    return;
  }

  console.log(chalk.green("🤖 Starting Memphis Bot with FULL integration..."));
  const bot = new MemphisBot(token);
  await bot.start();
}
