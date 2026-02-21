import chalk from "chalk";
import { spawn } from "child_process";
import { promisify } from "util";
import { exec } from "child_process";

const execAsync = promisify(exec);

interface TelegramUpdate {
  update_id: number;
  message?: {
    from: { id: number; first_name?: string };
    text: string;
    chat: { id: number };
  };
}

class MemphisBot {
  private token: string;
  private apiUrl: string;
  private offset: number = 0;

  constructor(token: string) {
    this.token = token;
    this.apiUrl = `https://api.telegram.org/bot${token}`;
  }

  async start() {
    console.log("🤖 Memphis Bot starting...");
    console.log(chalk.green("✅ Bot is running!"));
    console.log(chalk.gray("Send /help to the bot on Telegram"));
    await this.poll();
  }

  private async poll() {
    while (true) {
      try {
        const response = await fetch(`${this.apiUrl}/getUpdates?timeout=60&offset=${this.offset}`);
        const data = await response.json() as { ok: boolean; result?: TelegramUpdate[] };
        
        if (!data.ok || !data.result) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }
        
        for (const update of data.result) {
          this.offset = update.update_id + 1;
          
          if (update.message?.text) {
            await this.handleMessage(update.message.text, update.message.chat.id);
          }
        }
      } catch (e) {
        console.error("Poll error:", e);
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

  private async handleMessage(text: string, chatId: number) {
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
            "🤖 Memphis Bot\n\n" +
            "Komendy:\n" +
            "/ask [pytanie] - Zapytaj Memphis\n" +
            "/journal [tekst] - Dodaj wpis\n" +
            "/recall [słowo] - Szukaj w pamięci\n" +
            "/decide [tytuł] [wybór] - Zapisz decyzję\n" +
            "/status - Status systemu\n" +
            "/last - Ostatnie wpisy"
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
          
        default:
          await this.sendMessage(chatId, "❓ Nieznana komenda. Użyj /help");
      }
    } catch (e) {
      await this.sendMessage(chatId, `❌ Błąd: ${e}`);
    }
  }

  private truncate(text: string, max: number): string {
    if (text.length <= max) return text;
    return text.substring(0, max - 100) + "\n\n...(截断)";
  }

  private async sendMessage(chatId: number, text: string) {
    if (chatId === 0) return;
    
    try {
      await fetch(`${this.apiUrl}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          chat_id: chatId, 
          text,
          parse_mode: "Markdown"
        })
      });
    } catch (e) {
      console.error("Send error:", e);
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
