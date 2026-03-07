import chalk from "chalk";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import {
  extractRecallQuery,
  summarizeRecallOutput,
  runAutoRecallCore,
  buildAskInput,
} from "./autorecall-utils";

const execAsync = promisify(exec);

// Simple logger (LogChain temporarily disabled due to Memphis build issues)
class BotLogger {
  info(msg: string, _context?: Record<string, unknown>): void {
    const line = `[${new Date().toISOString()}] INFO: ${msg}`;
    process.stderr.write(line + "\n");
  }

  error(msg: string, err?: any, _context?: Record<string, unknown>): void {
    const line = `[${new Date().toISOString()}] ERROR: ${msg}${err ? ` - ${err}` : ''}`;
    process.stderr.write(line + "\n");
  }

  debug(msg: string, _context?: Record<string, unknown>): void {
    const line = `[${new Date().toISOString()}] DEBUG: ${msg}`;
    process.stderr.write(line + "\n");
  }

  close(): void {
    // No-op
  }
}

const logger = new BotLogger();

interface TelegramUpdate {
  update_id: number;
  message?: {
    from: { id: number; first_name?: string; username?: string };
    text: string;
    chat: { id: number; type?: string; title?: string };
  };
}

import { get } from "node:https";

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = get(url, {
      headers: { 'Connection': 'close' }
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

// Owner whitelist DID (from vault)
const OWNER_DID = process.env.MEMPHIS_OWNER_DID || "did:memphis:54f3dc8090b679fd817829f6be9d33ed";

class MemphisBot {
  private token: string;
  private apiUrl: string;
  private offset: number = 0;
  private readonly stateDir = join(homedir(), ".memphis", "state");
  private readonly offsetFile = join(this.stateDir, "telegram-bot.offset");
  private readonly lockFile = join("/tmp", "memphis-bot.lock");
  private stopped: boolean = false;
  private attempt: number = 0;
  private readonly MAX_ATTEMPTS = 10;
  private readonly BASE_BACKOFF_MS = 2000;
  private readonly MAX_BACKOFF_MS = 120000;
  private ownerId: number;
  private authorizedUsers: Set<number> = new Set(); // Authorized users (besides owner)
  private autoJournalRecent: Map<string, number> = new Map(); // dedup window cache

  constructor(token: string) {
    this.token = token;
    this.apiUrl = `https://api.telegram.org/bot${token}`;
    this.ownerId = parseInt(process.env.TELEGRAM_OWNER_ID || "0");
    this.offset = this.loadOffset();
  }

  private loadOffset(): number {
    try {
      if (!existsSync(this.offsetFile)) return 0;
      const raw = readFileSync(this.offsetFile, "utf8").trim();
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    } catch {
      return 0;
    }
  }

  private saveOffset(offset: number): void {
    try {
      mkdirSync(this.stateDir, { recursive: true });
      writeFileSync(this.offsetFile, String(offset), { mode: 0o600 });
    } catch (e) {
      logger.debug(`offset.save.failed ${String(e)}`);
    }
  }

  private acquireSingleInstanceLock(): boolean {
    try {
      writeFileSync(this.lockFile, String(process.pid), { flag: "wx", mode: 0o600 });
      return true;
    } catch {
      try {
        const existingPid = parseInt(readFileSync(this.lockFile, "utf8").trim(), 10);
        if (Number.isFinite(existingPid)) {
          try {
            process.kill(existingPid, 0);
            return false; // active process owns the lock
          } catch {
            // stale lock; continue to replace
          }
        }
        unlinkSync(this.lockFile);
        writeFileSync(this.lockFile, String(process.pid), { flag: "wx", mode: 0o600 });
        return true;
      } catch {
        return false;
      }
    }
  }

  private releaseSingleInstanceLock(): void {
    try {
      if (existsSync(this.lockFile)) unlinkSync(this.lockFile);
    } catch {
      // no-op
    }
  }

  private isOwner(userId: number): boolean {
    if (!this.ownerId) return true; // dev mode
    return userId === this.ownerId;
  }

  private canAccess(userId: number): boolean {
    // Owner has full access
    if (this.isOwner(userId)) return true;

    // Check if user is authorized (via whitelist)
    return this.authorizedUsers.has(userId);
  }

  private isGroup(chatId: number, chatType?: string): boolean {
    return chatType === "group" || chatType === "supergroup" || chatId < 0;
  }

  // Command categories for access control
  private getCommandCategory(cmd: string): "owner-only" | "authorized" | "public" {
    const ownerOnlyCommands = [
      "/status", "/journal", "/recall", "/decide", "/restart",
      "/auth", "/unauth", "/users", "/memphis"
    ];

    const publicCommands = ["/start", "/help", "/ping", "/whoami"];

    if (ownerOnlyCommands.includes(cmd)) return "owner-only";
    if (publicCommands.includes(cmd)) return "public";
    return "authorized"; // Default: requires authorization
  }

  private checkCommandAccess(cmd: string, userId: number, isOwner: boolean): boolean {
    const category = this.getCommandCategory(cmd);

    if (category === "public") return true;
    if (category === "owner-only") return isOwner;
    return this.canAccess(userId); // authorized commands
  }

  // Exponential backoff with jitter
  private backoffMs(attempt: number): number {
    const exp = Math.min(attempt, 7);
    const base = this.BASE_BACKOFF_MS * Math.pow(2, exp);
    const jitter = Math.random() * 0.3 * base;
    return Math.min(base + jitter, this.MAX_BACKOFF_MS);
  }

  async start() {
    if (!this.acquireSingleInstanceLock()) {
      logger.error(`Another bot instance is already running (lock: ${this.lockFile})`);
      process.exit(1);
    }

    logger.info("🤖 Memphis Bot starting (GROUP MODE)...");
    this.setupSignalHandlers();
    console.log(chalk.green("✅ Bot is running! (GROUP MODE)"));
    console.log(chalk.gray("Owner: " + (this.ownerId || "dev mode")));
    console.log(chalk.gray("Owner DID: " + OWNER_DID));
    console.log(chalk.gray("Send /help to bot on Telegram"));
    console.log(chalk.gray(`Offset start: ${this.offset}`));

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
        await new Promise(r => setTimeout(r, waitMs));
      }
    }
    logger.info("Bot loop exited");
    this.releaseSingleInstanceLock();
    logger.close();
    process.exit(0);
  }

  private setupSignalHandlers() {
    const shutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      this.stopped = true;
      this.releaseSingleInstanceLock();
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

        if (responseText.length < 100) {
          logger.info(`Poll raw: ${responseText}`);
        } else {
          logger.info(`Poll raw (first 200): ${responseText.substring(0, 200)}`);
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

        logger.info(`Poll: got ${data.result?.length || 0} updates`);

        if (!data.result || data.result.length === 0) {
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        for (const update of data.result) {
          logger.info(`Processing update ${update.update_id}: ${update.message?.text}`);
          this.offset = update.update_id + 1;
          this.saveOffset(this.offset);

          if (update.message?.text && update.message.from) {
            await this.handleMessage(
              update.message.text,
              update.message.chat.id,
              update.message.from.id,
              update.message.chat.type
            );
          }
        }
      } catch (e: any) {
        logger.error("Poll error", e.message || e);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  private stripCliNoise(text: string): string {
    if (!text) return "";
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "").trimEnd())
      .filter((l) => l.trim().length > 0)
      .filter((l) => !/^\s*\[?EmbeddingCache\]?/i.test(l))
      .filter((l) => !/^\s*DEBUG\s+EmbeddingCache/i.test(l))
      .filter((l) => !/^\s*EmbeddingCache\b/i.test(l));

    return lines.join("\n").trim();
  }

  private async runMemphis(args: string[]): Promise<string> {
    return new Promise((resolve) => {
      const proc = spawn("npx", ["tsx", "src/cli/index.ts", ...args], {
        cwd: "/home/memphis_ai_brain_on_chain/memphis",
        stdio: ["pipe", "pipe", "pipe"]
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => { stdout += data.toString(); });
      proc.stderr.on("data", (data) => { stderr += data.toString(); });

      proc.on("close", (code) => {
        const cleanOut = this.stripCliNoise(stdout);
        const cleanErr = this.stripCliNoise(stderr);

        console.log(`[RUNMEMPHIS] code=${code} stdout=${cleanOut.slice(0,100)} stderr=${cleanErr.slice(0,100)}`);

        if (code === 0) {
          if (cleanOut) return resolve(cleanOut);
          if (cleanErr) return resolve(cleanErr);
          return resolve("✅ Gotowe");
        }

        resolve(cleanErr || cleanOut || `Error: ${code}`);
      });

      proc.on("error", (err) => {
        console.log(`[RUNMEMPHIS] error=${err.message}`);
        resolve(`Error: ${err.message}`);
      });
    });
  }

  private extractRecallQuery(rawText: string): string | null {
    return extractRecallQuery(rawText);
  }

  private summarizeRecallOutput(raw: string, maxChars = 600): string {
    return summarizeRecallOutput(raw, maxChars);
  }

  private async runAutoRecall(rawText: string, maxHits = 5, timeoutMs = 1200): Promise<{
    status: "ok" | "skipped" | "timeout" | "error";
    query: string;
    summary: string;
    durationMs: number;
    error?: string;
  }> {
    const result = await runAutoRecallCore(
      rawText,
      (query, hits) => this.runMemphis(["recall", query, "--limit", String(hits)]),
      maxHits,
      timeoutMs,
    );

    if (result.status === "ok") {
      logger.debug(`autorecall.ok query="${result.query}" duration=${result.durationMs}ms summary_len=${result.summary.length}`);
    } else if (result.status === "timeout") {
      logger.debug(`autorecall.timeout query="${result.query}" duration=${result.durationMs}ms`);
    } else if (result.status === "error") {
      logger.debug(`autorecall.error query="${result.query}" duration=${result.durationMs}ms`);
    }

    return result;
  }

  private async buildAskInputWithRecall(question: string): Promise<string> {
    const recall = await this.runAutoRecall(question);
    return buildAskInput(question, recall);
  }

  private classifyAutoJournal(question: string, answer: string): {
    allowed: boolean;
    reason: string;
    tags: string[];
    taskId?: string;
  } {
    const q = question.toLowerCase();
    const a = answer.toLowerCase();
    const combined = `${q} ${a}`;

    const deny = /(hej|hello|siema|dzięki|thanks|ok\b|spoko|pong)/i.test(q) || question.trim().length < 8;
    if (deny) {
      return { allowed: false, reason: "low_signal", tags: [] };
    }

    const taskIdMatch = combined.match(/rm-\d{3}|s4-\d{2}|sprint\s*\d+/i);
    const taskId = taskIdMatch?.[0]?.toUpperCase();

    const tags = ["auto", "sprint-4", "task", "automation", "memphis"];

    if (/(error|błąd|failed|failure|timeout|exception|blocked|blokada)/i.test(combined)) {
      tags.push("blocked", "bug", "priority-1");
      return { allowed: true, reason: "blocker_or_error", tags, taskId };
    }

    if (/(done|completed|zrobione|zakończone|pass|wdrożone|gotowe)/i.test(combined)) {
      tags.push("done", "test", "priority-2");
      return { allowed: true, reason: "significant_progress", tags, taskId };
    }

    if (/(decyzj|wybier|wybór|decision|option|plan)/i.test(combined)) {
      tags.push("decision", "priority-2");
      return { allowed: true, reason: "decision", tags, taskId };
    }

    if (/(heartbeat|roadmap|queue|policy|cron|backup|share-sync|sync)/i.test(combined)) {
      tags.push("in-progress", "docs", "priority-2");
      return { allowed: true, reason: "operational_change", tags, taskId };
    }

    if (/(lesson|wniosek|nauczka|pattern|ograniczen|limitation)/i.test(combined)) {
      tags.push("in-progress", "docs", "priority-2");
      return { allowed: true, reason: "technical_learning", tags, taskId };
    }

    return { allowed: false, reason: "no_allow_signal", tags: [] };
  }

  private redactForJournal(text: string): string {
    const sanitized = this.filterSensitiveInfo(text).replace(/\s+/g, " ").trim();
    return sanitized.length > 320 ? sanitized.slice(0, 320) + "..." : sanitized;
  }

  private async maybeAutoJournalAsk(question: string, answer: string, source: string): Promise<void> {
    const verdict = this.classifyAutoJournal(question, answer);
    if (!verdict.allowed) {
      logger.debug(`autojournal.skip reason=${verdict.reason}`);
      return;
    }

    const dedupKey = `${source}:${(verdict.taskId || question).toLowerCase().slice(0, 80)}`;
    const now = Date.now();
    const prev = this.autoJournalRecent.get(dedupKey) || 0;
    const dedupWindowMs = 60 * 60 * 1000;

    if (now - prev < dedupWindowMs) {
      logger.debug(`autojournal.skip reason=dedup key=${dedupKey}`);
      return;
    }

    const q = this.redactForJournal(question);
    const a = this.redactForJournal(answer);
    const refs = verdict.taskId ? ` refs:${verdict.taskId}` : "";
    const entry = `[auto-journal][${source}] Q:${q} | A:${a} | reason:${verdict.reason}${refs}`;
    const tags = verdict.tags.join(",");

    try {
      await this.runMemphis(["journal", entry, "-t", tags]);
      this.autoJournalRecent.set(dedupKey, now);
      logger.debug(`autojournal.ok reason=${verdict.reason} tags=${tags}`);
    } catch (err) {
      logger.debug(`autojournal.error ${String(err)}`);
    }
  }

  private async handleMessage(text: string, chatId: number, userId: number, chatType?: string) {
    console.log(`[HANDLE] text="${text}" chatId=${chatId} userId=${userId} chatType=${chatType}`);
    const isOwner = this.isOwner(userId);
    const canAccess = this.canAccess(userId);
    const isGroup = this.isGroup(chatId, chatType);

    // Non-owner, non-authorized user: limited access
    if (!canAccess) {
      // In groups, allow /ask only
      if (isGroup && text.startsWith("/ask ")) {
        const question = text.substring(5).trim();
        if (question) {
          await this.sendMessage(chatId, `🤔 *${question}*...`);
          const askInput = await this.buildAskInputWithRecall(question);
          const answer = await this.runMemphis(["ask", askInput, "--provider", "ollama", "--model", "qwen2.5-coder:3b"]);
          // Filter sensitive info (basic example)
          const filtered = this.filterSensitiveInfo(answer);
          await this.sendMessage(chatId, this.truncate(filtered, 4000));
        }
      } else if (isGroup && !text.startsWith("/")) {
        // Treat non-commands in group as questions too
        await this.sendMessage(chatId, `🤔 *${text}*...`);
        const askInput = await this.buildAskInputWithRecall(text);
        const answer = await this.runMemphis(["ask", askInput, "--provider", "ollama", "--model", "qwen2.5-coder:3b"]);
        const filtered = this.filterSensitiveInfo(answer);
        await this.sendMessage(chatId, this.truncate(filtered, 4000));
      } else {
        // Direct message or unauthorized commands: reject
        logger.info(`Rejected message from unauthorized user ${userId}`);
        await this.sendMessage(chatId, "🚫 *Brak dostępu*\n\nTen bot wymaga autoryzacji. Skontaktuj się z ownerem.");
      }
      return;
    }

    // Owner or authorized user: full access
    const trimmed = text.trim();

    // Non-command in group: treat as question
    if (isGroup && !trimmed.startsWith("/")) {
      await this.sendMessage(chatId, `🤔 *${trimmed}*...`);
      const askInput = await this.buildAskInputWithRecall(trimmed);
      const answer = await this.runMemphis(["ask", askInput, "--provider", "ollama", "--model", "qwen2.5-coder:3b"]);
      await this.sendMessage(chatId, this.truncate(answer, 4000));
      await this.maybeAutoJournalAsk(trimmed, answer, "ask.group.text");
      return;
    }

    // Non-command in DM: also treat as question
    if (!isGroup && !trimmed.startsWith("/")) {
      await this.sendMessage(chatId, `🤔 *${trimmed}*...`);
      const askInput = await this.buildAskInputWithRecall(trimmed);
      const answer = await this.runMemphis(["ask", askInput, "--provider", "ollama", "--model", "qwen2.5-coder:3b"]);
      await this.sendMessage(chatId, this.truncate(answer, 4000));
      await this.maybeAutoJournalAsk(trimmed, answer, "ask.dm.text");
      return;
    }

    // Commands
    const [cmd, ...args] = trimmed.split(" ");
    const arg = args.join(" ");

    try {
      switch (cmd.toLowerCase()) {
        case "/start":
        case "/help":
          const role = isOwner ? "OWNER (pełny dostęp)" : "Authorized (ograniczony dostęp)";
          await this.sendMessage(chatId,
            "🤖 MemphisBrain_bot (GROUP MODE)\n" +
            "━━━━━━━━━━━━━━━━━━━━\n\n" +
            `👤 Twój dostęp: ${role}\n\n` +
            "📋 Komendy dla wszystkich:\n" +
            "• /ask [pytanie] - Zapytaj Memphis\n" +
            "• tekst bez / - Też zadaj pytanie\n\n" +
            (isOwner ? "👑 OWNER ONLY:\n" +
            "• /memphis [komenda] - Wykonaj komendę Memphis CLI\n" +
            "• /status - Status łańcuchów\n" +
            "• /journal [tekst] - Dodaj wpis\n" +
            "• /recall [słowo] - Szukaj w pamięci\n" +
            "• /decide [tytuł] [wybór] - Zapisz decyzję\n" +
            "• /restart - Restart bota\n" +
            "• /auth [user_id] - Autoryzuj użytkownika\n" +
            "• /unauth [user_id] - Odbierz dostęp\n" +
            "• /users - Lista autoryzowanych\n\n" : "") +
            "━━━━━━━━━━━━━━━━━━━━\n" +
            "Bot: @MemphisBrain_bot\n" +
            `Owner DID: ${OWNER_DID}\n`
          );
          break;

        case "/status":
          if (!isOwner) {
            await this.sendMessage(chatId, "🚫 *Tylko owner*");
            return;
          }
          await this.sendMessage(chatId, "📊 Sprawdzam...");
          const status = await this.runMemphis(["status"]);
          await this.sendMessage(chatId, this.truncate(status, 4000));
          break;

        case "/ask":
          if (!arg) {
            await this.sendMessage(chatId, "❓ Użyj: /ask [pytanie]");
            return;
          }
          await this.sendMessage(chatId, `🤔 *${arg}*...`);
          const askInput = await this.buildAskInputWithRecall(arg);
          const answer = await this.runMemphis(["ask", askInput, "--provider", "ollama", "--model", "qwen2.5-coder:3b"]);
          await this.sendMessage(chatId, this.truncate(answer, 4000));
          await this.maybeAutoJournalAsk(arg, answer, "ask.command");
          break;

        case "/journal":
          if (!isOwner) {
            await this.sendMessage(chatId, "🚫 *Tylko owner*");
            return;
          }
          if (!arg) {
            await this.sendMessage(chatId, "❓ Użyj: /journal [tekst]");
            return;
          }
          const journalResult = await this.runMemphis(["journal", arg]);
          await this.sendMessage(chatId, this.truncate(journalResult, 4000));
          break;

        case "/recall":
          if (!isOwner) {
            await this.sendMessage(chatId, "🚫 *Tylko owner*");
            return;
          }
          if (!arg) {
            await this.sendMessage(chatId, "❓ Użyj: /recall [słowo]");
            return;
          }
          await this.sendMessage(chatId, `🔍 Szukam: ${arg}...`);
          const recallResult = await this.runMemphis(["recall", arg, "--limit", "5"]);
          await this.sendMessage(chatId, this.truncate(recallResult, 4000));
          break;

        case "/decide":
          if (!isOwner) {
            await this.sendMessage(chatId, "🚫 *Tylko owner*");
            return;
          }
          const parts = (arg.match(/(?:[^\s"]+|"[^"]*")+/g) || []);
          if (parts.length < 2) {
            await this.sendMessage(chatId, "❓ Użyj: /decide [tytuł] [wybór]");
            return;
          }
          const title = parts[0].replace(/"/g, "");
          const chosen = parts.slice(1).join(" ").replace(/"/g, "");
          await this.sendMessage(chatId, `📝 Decyzja: ${title} → ${chosen}`);
          const decideResult = await this.runMemphis(["decide", title, chosen]);
          await this.sendMessage(chatId, this.truncate(decideResult, 4000));
          break;

        case "/restart":
          if (!isOwner) {
            await this.sendMessage(chatId, "🚫 *Tylko owner*");
            return;
          }
          await this.sendMessage(chatId, "🔄 Restartuję bota...");
          this.stopped = true;
          break;

        case "/auth":
          if (!isOwner) {
            await this.sendMessage(chatId, "🚫 *Tylko owner*");
            return;
          }
          if (!arg) {
            await this.sendMessage(chatId, "❓ Użyj: /auth [user_id]");
            return;
          }
          const authUserId = parseInt(arg);
          if (isNaN(authUserId)) {
            await this.sendMessage(chatId, "❓ Nieprawidłowe user_id");
            return;
          }
          this.authorizedUsers.add(authUserId);
          await this.sendMessage(chatId, `✅ Autoryzowano użytkownika: ${authUserId}`);
          logger.info(`Authorized user: ${authUserId}`);
          break;

        case "/unauth":
          if (!isOwner) {
            await this.sendMessage(chatId, "🚫 *Tylko owner*");
            return;
          }
          if (!arg) {
            await this.sendMessage(chatId, "❓ Użyj: /unauth [user_id]");
            return;
          }
          const unauthUserId = parseInt(arg);
          if (isNaN(unauthUserId)) {
            await this.sendMessage(chatId, "❓ Nieprawidłowe user_id");
            return;
          }
          this.authorizedUsers.delete(unauthUserId);
          await this.sendMessage(chatId, `✅ Odbrano dostęp użytkownikowi: ${unauthUserId}`);
          logger.info(`Unauthorized user: ${unauthUserId}`);
          break;

        case "/users":
          if (!isOwner) {
            await this.sendMessage(chatId, "🚫 *Tylko owner*");
            return;
          }
          const usersList = Array.from(this.authorizedUsers).join(", ");
          await this.sendMessage(chatId,
            `👥 *Autoryzowani użytkownicy:*\n\n` +
            (usersList || "*Brak*") +
            `\n\n👑 Owner: ${this.ownerId}`
          );
          break;

        case "/whoami":
          await this.sendMessage(chatId,
            `🤖 *Bot Identity*\n\n` +
            `Bot: @MemphisBrain_bot\n` +
            `Chat ID: ${chatId}\n` +
            `User ID: ${userId}\n` +
            `Is Owner: ${isOwner ? '✅ Tak' : '❌ Nie'}\n` +
            `Can Access: ${canAccess ? '✅ Tak' : '❌ Nie'}\n` +
            `Owner DID: ${OWNER_DID}`
          );
          break;

        case "/ping":
          const uptime = process.uptime();
          const minutes = Math.floor(uptime / 60);
          await this.sendMessage(chatId, `🏓 *Pong!*\n\n✅ Bot działa!\n⏱️ Uptime: ${minutes} min\n👑 Owner: ${this.ownerId}`);
          break;

        case "/memphis":
          if (!isOwner) {
            await this.sendMessage(chatId, "🚫 *Tylko owner*");
            return;
          }
          if (!arg) {
            await this.sendMessage(chatId,
              "❓ *Użyj: /memphis [komenda]*\n\n" +
              "Przykłady:\n" +
              "/memphis log test --level INFO\n" +
              "/memphis logs tail 5\n" +
              "/memphis exec \"ls -la\"\n" +
              "/memphis execs query\n" +
              "/memphis sys system\n" +
              "/memphis status"
            );
            return;
          }
          await this.sendMessage(chatId, `⚡ Wykonuję: memphis ${arg}...`);
          try {
            const memphisArgs = arg.split(" ");
            const result = await this.runMemphis(memphisArgs);
            await this.sendMessage(chatId, this.truncate(result, 4000));
          } catch (error) {
            await this.sendMessage(chatId, `❌ *Błąd:* ${error}`);
          }
          break;

        default:
          await this.sendMessage(chatId, "❓ Nieznana komenda. Użyj /help");
      }
    } catch (e) {
      await this.sendMessage(chatId, `❌ Błąd: ${e}`);
    }
  }

  private filterSensitiveInfo(text: string): string {
    // Basic filter - can be enhanced
    // Remove API keys, passwords, etc.
    let filtered = text;

    // Remove common secret patterns
    filtered = filtered.replace(/sk-[a-zA-Z0-9]{48}/g, "***HIDDEN***");
    filtered = filtered.replace(/[a-f0-9]{64}/gi, "***HASH***"); // 64-char hashes

    return filtered;
  }

  private sanitizeTelegramOutput(text: string): string {
    if (!text) return "";

    // 1) remove low-level CLI/cache noise
    let out = this.stripCliNoise(text);

    // 2) remove ANSI escape codes
    out = out.replace(/\x1B\[[0-9;]*[A-Za-z]/g, "");

    // 3) strip obvious debug/system chatter
    out = out
      .split(/\r?\n/)
      .filter((l) => !/^\s*\[RUNMEMPHIS\]/i.test(l))
      .filter((l) => !/^\s*DEBUG[:\s]/i.test(l))
      .filter((l) => !/^\s*manpath:/i.test(l))
      .filter((l) => !/^\s*-bash:\s.*setlocale/i.test(l))
      .join("\n");

    // 4) redact secrets/hash-like blobs
    out = this.filterSensitiveInfo(out);

    return out.trim();
  }

  private truncate(text: string, max: number): string {
    const clean = this.sanitizeTelegramOutput(text);
    if (!clean) return "(pusta odpowiedź)";
    if (clean.length <= max) return clean;
    return clean.substring(0, max - 100) + "\n\n...(więcej)";
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

      if (!result.ok && String(result.description || "").includes("can't parse entities")) {
        // Fallback: resend as plain text when Telegram Markdown parsing fails
        const plainResp = await fetch(`${this.apiUrl}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text
          })
        });
        const plainResult = await plainResp.json();
        logger.info(`Sent message to ${chatId}: ${plainResult.ok ? 'OK (fallback plain)' : `FAILED (${plainResult.description || 'unknown'})`}`);
        return;
      }

      logger.info(`Sent message to ${chatId}: ${result.ok ? 'OK' : `FAILED (${result.description || 'unknown'})`}`);
    } catch (e) {
      logger.error("Send error", e);
    }
  }
}

export async function botCommand(action?: string) {
  let token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    const config = loadConfig();
    token = config.telegram?.bot_token;
  }

  if (!token) {
    console.log(chalk.red("❌ No bot token!"));
    console.log(chalk.gray("Set TELEGRAM_BOT_TOKEN env or telegram.bot_token in config"));
    return;
  }

  console.log(chalk.green("🤖 Starting Memphis Bot (GROUP MODE)..."));
  const bot = new MemphisBot(token);
  await bot.start();
}

// Run the bot when executed directly
botCommand().catch(err => {
  console.error(chalk.red("❌ Bot failed:"), err);
  process.exit(1);
});
