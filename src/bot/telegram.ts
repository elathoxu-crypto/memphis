/**
 * Memphis Telegram Bot
 * 
 * Responds to messages with Memphis AI responses
 */

import { loadConfig } from "../config/loader.js";
import { askCommand } from "../cli/commands/ask.js";
import { journalCommand } from "../cli/commands/journal.js";
import { recallCommand } from "../cli/commands/recall.js";
import { statusCommand } from "../cli/commands/status.js";
import { Store } from "../memory/store.js";

interface TelegramUpdate {
  update_id: number;
  message?: {
    from: { id: number; first_name?: string };
    text: string;
    chat: { id: number };
  };
}

export class MemphisBot {
  private token: string;
  private apiUrl: string;
  private offset: number = 0;

  constructor(token: string) {
    this.token = token;
    this.apiUrl = `https://api.telegram.org/bot${token}`;
  }

  async start() {
    console.log("🤖 Memphis Bot starting...");
    await this.sendMessage(parseInt(process.env.TELEGRAM_CHAT_ID || "0"), 
      "✅ Memphis Bot uruchomiony!\n\nDostępne komendy:\n/ask [pytanie] - Zapytaj Memphis\n/journal [tekst] - Dodaj wpis\n/recall [słowo] - Szukaj w pamięci\n/status - Status\n/help - Pomoc");
    
    this.loop();
  }

  private async loop() {
    while (true) {
      try {
        await this.poll();
      } catch (e) {
        console.error("Poll error:", e);
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  private async poll() {
    const response = await fetch(`${this.apiUrl}/getUpdates?timeout=60&offset=${this.offset}`);
    const data = await response.json() as { ok: boolean; result?: TelegramUpdate[] };
    
    if (!data.ok || !data.result) return;
    
    for (const update of data.result) {
      this.offset = update.update_id + 1;
      
      if (update.message?.text) {
        await this.handleMessage(update.message.text, update.message.chat.id);
      }
    }
  }

  private async handleMessage(text: string, chatId: number) {
    // Jeśli nie zaczyna się od /, traktuj jako czat
    if (!text.startsWith("/")) {
      // Natural chat - just ask Memphis
      await this.sendMessage(chatId, `💭 ${text.slice(0, 50)}...`);
      let output = "";
      const originalWrite = process.stdout.write.bind(process.stdout);
      const chunks: string[] = [];
      process.stdout.write = (chunk: any) => { chunks.push(String(chunk)); return true; };
      try {
        await askCommand(text, { noSave: false, json: false });
      } finally {
        process.stdout.write = originalWrite;
        output = chunks.join("\n");
      }
      const answer = output.split("📚")[0]?.split("💾")[0]?.trim() || output.slice(0, 4000);
      await this.sendMessage(chatId, answer.slice(0, 4000));
      return;
    }

    const [cmd, ...args] = text.split(" ");
    const arg = args.join(" ");

    // Helper to capture output
    let output = "";
    const originalWrite = process.stdout.write.bind(process.stdout);
    const originalLog = console.log;
    const captureOutput = (fn: () => Promise<void>) => {
      output = "";
      const chunks: string[] = [];
      process.stdout.write = (chunk: any) => { chunks.push(String(chunk)); return true; };
      console.log = (...args: any[]) => { chunks.push(args.join(" ")); };
      return fn().finally(() => {
        process.stdout.write = originalWrite;
        console.log = originalLog;
        output = chunks.join("\n");
      });
    };

    try {
      switch (cmd.toLowerCase()) {
        case "/start":
        case "/help":
          await this.sendMessage(chatId, 
            "🤖 Memphis Bot\n\nKomendy:\n/ask [pytanie] - Zapytaj Memphis\n/journal [tekst] - Dodaj wpis\n/recall [słowo] - Szukaj w pamięci\n/status - Status\n/verify - Sprawdź łańcuchy");
          break;
          
        case "/status":
          await this.sendMessage(chatId, "📊 Sprawdzam status...");
          await captureOutput(() => statusCommand({ json: false }));
          await this.sendMessage(chatId, output.slice(0, 4000));
          break;
          
        case "/verify":
          await this.sendMessage(chatId, "🔍 Weryfikuję łańcuchy...");
          const config = loadConfig();
          const store = new Store(config.memory.path);
          const { verifyChain } = await import("../memory/chain.js");
          const chains = ["journal", "ask", "decision", "decisions", "immortal", "vault"];
          let result = "✅ Weryfikacja:\n";
          for (const chain of chains) {
            try {
              const blocks = store.readChain(chain);
              const { valid } = verifyChain(blocks);
              result += `${chain}: ${valid ? "✅" : "❌"} (${blocks.length} bloków)\n`;
            } catch {
              result += `${chain}: ⚠️ błąd\n`;
            }
          }
          await this.sendMessage(chatId, result.slice(0, 4000));
          break;
          
        case "/ask":
          if (!arg) {
            await this.sendMessage(chatId, "❓ Użyj: /ask [pytanie]");
            return;
          }
          await this.sendMessage(chatId, `🤔 ${arg}...`);
          await captureOutput(() => askCommand(arg, { noSave: false, json: false }));
          // Extract answer from output (skip debug lines)
          const answer = output.split("📚")[0]?.split("💾")[0]?.trim() || output.slice(0, 4000);
          await this.sendMessage(chatId, answer.slice(0, 4000));
          break;
          
        case "/journal":
          if (!arg) {
            await this.sendMessage(chatId, "❓ Użyj: /journal [tekst]");
            return;
          }
          await this.sendMessage(chatId, `📝 Dodaję: ${arg}`);
          await captureOutput(() => journalCommand(arg, { tags: "telegram" }));
          await this.sendMessage(chatId, output.includes("✓") ? "✅ Zapisano!" : "⚠️ " + output.slice(0, 200));
          break;
          
        case "/recall":
          if (!arg) {
            await this.sendMessage(chatId, "❓ Użyj: /recall [słowo]");
            return;
          }
          await this.sendMessage(chatId, `🔍 Szukam: ${arg}`);
          await captureOutput(() => recallCommand(arg, "", { chain: undefined, type: undefined, limit: "5", tag: undefined, since: undefined, until: undefined, project: false, all: false, json: false, includeVault: false }));
          await this.sendMessage(chatId, output.slice(0, 4000));
          break;
          
        default:
          await this.sendMessage(chatId, "❓ Nieznana komenda. Użyj /help");
      }
    } catch (e) {
      await this.sendMessage(chatId, `❌ Błąd: ${e}`);
    }
  }

  private async sendMessage(chatId: number, text: string) {
    if (chatId === 0) return;
    
    const res = await fetch(`${this.apiUrl}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text })
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`Failed to send message: ${res.status} ${err}`);
    }
  }
}

// Run if called directly
const token = process.env.TELEGRAM_BOT_TOKEN;
if (token && process.argv[1]?.endsWith("bot.js")) {
  const bot = new MemphisBot(token);
  bot.start();
}
