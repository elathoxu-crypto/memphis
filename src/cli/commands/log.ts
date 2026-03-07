/**
 * Log CLI Commands - Add and query logs
 */

import { LogChain, LogLevel, LogSource, LogFilters } from "../../chains/log.js";

export async function logCommand(args: string[]) {
  const command = args[0];
  const params = args.slice(1);

  const logChain = new LogChain();

  switch (command) {
    case "info":
    case "INFO":
      return addLog(logChain, "INFO", params.join(" "));
    
    case "warn":
    case "WARN":
      return addLog(logChain, "WARN", params.join(" "));
    
    case "error":
    case "ERROR":
      return addLog(logChain, "ERROR", params.join(" "));
    
    case "debug":
    case "DEBUG":
      return addLog(logChain, "DEBUG", params.join(" "));
    
    case "critical":
    case "CRITICAL":
      return addLog(logChain, "CRITICAL", params.join(" "));
    
    case "logs":
      return queryLogs(logChain, params);
    
    case "stats":
      return showStats(logChain);
    
    case "tail":
      return showTail(logChain, parseInt(params[0]) || 100);
    
    case "export":
      return exportLogs(logChain, params);
    
    default:
      console.log(`❓ Nieznana komenda: ${command}`);
      console.log(`\nUżycie: memphis log <level> <message>`);
      console.log(`\nPoziomy: DEBUG, INFO, WARN, ERROR, CRITICAL`);
      console.log(`\nPrzykłady:`);
      console.log(`  memphis log info "Bot started"`);
      console.log(`  memphis log error "API timeout"`);
      console.log(`  memphis logs --source memphis-bot --level ERROR --last 1h`);
      console.log(`  memphis logs --tail 50`);
      console.log(`  memphis logs --export json > logs.json`);
      console.log(`  memphis log stats`);
  }
}

async function addLog(
  logChain: LogChain,
  level: LogLevel,
  message: string
): Promise<void> {
  const source: LogSource = "memphis-cli";
  const context = extractContext();

  const id = logChain.add(level, message, source, context);
  
  console.log(`✓ Log dodany: [${id}] ${level}: ${message}`);
}

async function queryLogs(logChain: LogChain, params: string[]): Promise<void> {
  const filters = parseFilters(params);
  const logs = logChain.query(filters);

  console.log(`\n📊 Znaleziono ${logs.length} logów:\n`);
  
  for (const log of logs.slice(0, 100)) {
    const levelIcon = getLevelIcon(log.level);
    console.log(`${levelIcon} [${log.timestamp.substring(0, 19)}] ${log.source}: ${log.message}`);
  }

  if (logs.length > 100) {
    console.log(`\n... i ${logs.length - 100} więcej`);
  }
}

async function showTail(logChain: LogChain, n: number): Promise<void> {
  const logs = logChain.tail(n);

  console.log(`\n📊 Ostatnie ${logs.length} logów:\n`);

  for (const log of logs) {
    const levelIcon = getLevelIcon(log.level);
    console.log(`${levelIcon} [${log.timestamp.substring(0, 19)}] ${log.source}: ${log.message}`);
  }
}

async function showStats(logChain: LogChain): Promise<void> {
  const stats = logChain.stats();

  console.log(`\n📊 Statystyki logów:\n`);
  console.log(`  Total: ${stats.total}`);
  console.log(`\n  Poziomy:`);
  for (const [level, count] of Object.entries(stats.byLevel)) {
    if (count > 0) {
      console.log(`    ${level}: ${count}`);
    }
  }
  console.log(`\n  Źródła:`);
  for (const [source, count] of Object.entries(stats.bySource)) {
    if (count > 0) {
      console.log(`    ${source}: ${count}`);
    }
  }
  console.log(`\n  Ostatnia godzina: ${stats.last1h.total}`);
  for (const [level, count] of Object.entries(stats.last1h.byLevel)) {
    if (count > 0) {
      console.log(`    ${level}: ${count}`);
    }
  }
}

async function exportLogs(logChain: LogChain, params: string[]): Promise<void> {
  const format = (params[0] || "json") as "json" | "csv";
  const data = logChain.export(format);

  if (format === "json") {
    console.log(data);
  } else {
    console.log(data);
  }
}

function parseFilters(params: string[]): LogFilters {
  const filters: LogFilters = {};

  for (let i = 0; i < params.length; i++) {
    const param = params[i];

    if (param === "--source" && params[i + 1]) {
      filters.source = params[++i] as LogSource;
    } else if (param === "--level" && params[i + 1]) {
      filters.level = params[++i] as LogLevel;
    } else if (param === "--last" && params[i + 1]) {
      const duration = parseDuration(params[++i]);
      filters.since = new Date(Date.now() - duration).toISOString();
    } else if (param === "--search" && params[i + 1]) {
      filters.search = params[++i];
    }
  }

  return filters;
}

function parseDuration(str: string): number {
  const match = str.match(/^(\d+)([hmd])$/);
  if (!match) return 3600000; // 1h default

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case "h": return value * 60 * 60 * 1000;
    case "m": return value * 60 * 1000;
    case "d": return value * 24 * 60 * 60 * 1000;
    default: return 3600000;
  }
}

function extractContext(): any {
  // Extract context from environment or command line
  const context: any = {};

  if (process.env.MEMPHIS_COMMAND) {
    context.command = process.env.MEMPHIS_COMMAND;
  }

  if (process.env.MEMPHIS_ARGS) {
    try {
      context.args = JSON.parse(process.env.MEMPHIS_ARGS);
    } catch {
      context.args = [];
    }
  }

  return context;
}

function getLevelIcon(level: LogLevel): string {
  switch (level) {
    case "DEBUG": return "🔵";
    case "INFO": return "✅";
    case "WARN": return "⚠️";
    case "ERROR": return "❌";
    case "CRITICAL": return "🔥";
  default: return "📋";
  }
}
