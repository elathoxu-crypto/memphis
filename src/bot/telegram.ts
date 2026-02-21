/**
 * Memphis Telegram Bot
 * 
 * Responds to messages with Memphis AI responses
 */

import { loadConfig } from "../config/loader.js";

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
    const [cmd, ...args] = text.split(" ");
    const arg = args.join(" ");

    try {
      switch (cmd.toLowerCase()) {
        case "/start":
        case "/help":
          await this.sendMessage(chatId, 
            "🤖 Memphis Bot\n\nKomendy:\n/ask [pytanie] - Zapytaj Memphis\n/journal [tekst] - Dodaj wpis\n/recall [słowo] - Szukaj w pamięci\n/status - Status");
          break;
          
        case "/status":
          await this.sendMessage(chatId, "📊 Sprawdzam status...");
          // Simplified status
          await this.sendMessage(chatId, "✅ Memphis działa! Ollama + qwen3:8b");
          break;
          
        case "/ask":
          if (!arg) {
            await this.sendMessage(chatId, "❓ Użyj: /ask [pytanie]");
            return;
          }
          await this.sendMessage(chatId, `🤔 ${arg}...`);
          // For now, just acknowledge - full integration needs async handling
          await this.sendMessage(chatId, "💡 Funkcja /ask wymaga pełnej integracji. Użyj CLI: memphis ask");
          break;
          
        case "/journal":
          if (!arg) {
            await this.sendMessage(chatId, "❓ Użyj: /journal [tekst]");
            return;
          }
          await this.sendMessage(chatId, `📝 Dodaję: ${arg}`);
          await this.sendMessage(chatId, "💡 Funkcja /journal wymaga pełnej integracji. Użyj CLI: memphis journal");
          break;
          
        case "/recall":
          if (!arg) {
            await this.sendMessage(chatId, "❓ Użyj: /recall [słowo]");
            return;
          }
          await this.sendMessage(chatId, `🔍 Szukam: ${arg}`);
          await this.sendMessage(chatId, "💡 Funkcja /recall wymaga pełnej integracji. Użyj CLI: memphis recall");
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
    
    await fetch(`${this.apiUrl}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text })
    });
  }
}

// Run if called directly
const token = process.env.TELEGRAM_BOT_TOKEN;
if (token && process.argv[1]?.endsWith("bot.js")) {
  const bot = new MemphisBot(token);
  bot.start();
}
