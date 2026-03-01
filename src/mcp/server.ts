import { recall, type RecallQuery } from "../core/recall.js";
import { buildStatusReport } from "../core/status.js";
import { createDecisionV1 } from "../decision/schema.js";
import { createWorkspaceStore } from "../cli/utils/workspace-store.js";
import type { Block } from "../memory/chain.js";
import {
  memphisToolDefinitions,
  type MemphisSearchInput,
  type MemphisRecallInput,
  type MemphisDecisionCreateInput,
  type MemphisJournalAddInput,
  type MemphisStatusInput,
  type MemphisToolName,
} from "./tools.js";

const JSONRPC_VERSION = "2.0";
const DEFAULT_PROTOCOL_VERSION = "2024-11-05";
const SERVER_NAME = "memphis-mcp";
const SERVER_VERSION = "0.1.0";

type RpcId = string | number | null;

interface RpcRequest {
  jsonrpc: typeof JSONRPC_VERSION;
  id?: RpcId;
  method: string;
  params?: unknown;
}

interface RpcNotification {
  jsonrpc: typeof JSONRPC_VERSION;
  method: string;
  params?: unknown;
}

interface RpcResponse {
  jsonrpc: typeof JSONRPC_VERSION;
  id: RpcId;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

interface ToolContentText {
  type: "text";
  text: string;
}

interface ToolContentJson {
  type: "json";
  json: unknown;
}

type ToolContent = ToolContentText | ToolContentJson;

interface ToolResult {
  content: ToolContent[];
  isError?: boolean;
  meta?: Record<string, unknown>;
}

export interface MemphisMcpServerOptions {
  stdin?: NodeJS.ReadStream;
  stdout?: NodeJS.WriteStream;
  stderr?: NodeJS.WriteStream;
  protocolVersion?: string;
}

class RpcError extends Error {
  constructor(
    public readonly code: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = "RpcError";
  }
}

type MessageHandler = (message: RpcRequest | RpcNotification) => void | Promise<void>;

class ContentLengthTransport {
  private buffer: Buffer = Buffer.alloc(0);

  constructor(
    private readonly stream: NodeJS.WritableStream,
    private readonly onMessage: MessageHandler,
    private readonly logError: (message: string, err?: unknown) => void,
  ) {}

  push(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);

    while (true) {
      const headerEnd = this.findHeaderEnd();
      if (headerEnd === -1) {
        return;
      }

      const headerStr = this.buffer.slice(0, headerEnd).toString("utf8");
      const contentLength = this.parseContentLength(headerStr);
      if (contentLength === null) {
        this.logError("Missing Content-Length header");
        this.buffer = this.buffer.slice(headerEnd + 4);
        continue;
      }
      if (this.buffer.length < headerEnd + 4 + contentLength) {
        return;
      }

      const bodyStart = headerEnd + 4;
      const body = this.buffer.slice(bodyStart, bodyStart + contentLength).toString("utf8");
      this.buffer = this.buffer.slice(bodyStart + contentLength);

      try {
        const message = JSON.parse(body) as RpcRequest | RpcNotification;
        if (!message || message.jsonrpc !== JSONRPC_VERSION || typeof message.method !== "string") {
          this.logError("Ignoring invalid JSON-RPC message", message);
          continue;
        }
        void this.onMessage(message);
      } catch (err) {
        this.logError("Failed to parse JSON-RPC body", err);
      }
    }
  }

  send(message: RpcResponse | RpcNotification): void {
    const payload = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(payload, "utf8")}\r\n\r\n`;
    this.stream.write(header);
    this.stream.write(payload);
  }

  private findHeaderEnd(): number {
    let idx = this.buffer.indexOf("\r\n\r\n");
    if (idx !== -1) return idx;
    idx = this.buffer.indexOf("\n\n");
    return idx;
  }

  private parseContentLength(header: string): number | null {
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) return null;
    return Number.parseInt(match[1], 10);
  }
}

export class MemphisMcpServer {
  private readonly stdin: NodeJS.ReadStream;
  private readonly stdout: NodeJS.WriteStream;
  private readonly stderr: NodeJS.WriteStream;
  private readonly protocolVersion: string;
  private readonly ctx = createWorkspaceStore();
  private readonly transport: ContentLengthTransport;
  private readonly toolHandlers: Record<MemphisToolName, (input: unknown) => Promise<ToolResult>>;
  private stopPromise: Promise<void> | null = null;
  private stopResolver: (() => void) | null = null;
  private started = false;
  private initialized = false;
  private shuttingDown = false;
  private readonly debugEnabled = process.env.MEMPHIS_MCP_DEBUG === "1";

  private readonly onData = (chunk: Buffer | string): void => {
    const buffer = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
    this.transport.push(buffer);
  };

  private readonly onEnd = (): void => {
    this.logDebug("stdin closed");
    this.stop();
  };

  constructor(options: MemphisMcpServerOptions = {}) {
    this.stdin = options.stdin ?? process.stdin;
    this.stdout = options.stdout ?? process.stdout;
    this.stderr = options.stderr ?? process.stderr;
    this.protocolVersion = options.protocolVersion ?? DEFAULT_PROTOCOL_VERSION;

    this.transport = new ContentLengthTransport(this.stdout, (message) => this.handleMessage(message), (msg, err) => {
      this.logError(msg, err);
    });

    this.toolHandlers = {
      "memphis.search": (input) => this.handleSearchTool(input),
      "memphis.recall": (input) => this.handleRecallTool(input),
      "memphis.decision.create": (input) => this.handleDecisionTool(input),
      "memphis.journal.add": (input) => this.handleJournalTool(input),
      "memphis.status": (input) => this.handleStatusTool(input),
    };
  }

  async start(): Promise<void> {
    if (this.started) {
      return this.stopPromise ?? Promise.resolve();
    }
    this.started = true;
    this.stdin.on("data", this.onData);
    this.stdin.on("end", this.onEnd);
    this.stdin.on("close", this.onEnd);
    this.stdin.resume();

    this.stopPromise = new Promise<void>((resolve) => {
      this.stopResolver = resolve;
    });

    this.logDebug("Memphis MCP server started (stdio transport)");
    return this.stopPromise;
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.stdin.off("data", this.onData);
    this.stdin.off("end", this.onEnd);
    this.stdin.off("close", this.onEnd);
    this.stopResolver?.();
    this.stopResolver = null;
    this.stopPromise = null;
    this.logDebug("Memphis MCP server stopped");
  }

  private async handleMessage(message: RpcRequest | RpcNotification): Promise<void> {
    if ("id" in message && message.id !== undefined) {
      await this.handleRequest(message as RpcRequest);
    } else {
      this.handleNotification(message as RpcNotification);
    }
  }

  private async handleRequest(message: RpcRequest): Promise<void> {
    const id = message.id ?? null;
    try {
      const result = await this.dispatch(message.method, message.params);
      this.sendResponse(id, result ?? null);
    } catch (err) {
      if (err instanceof RpcError) {
        this.sendError(id, err.code, err.message, err.data);
      } else {
        this.logError(`Unhandled error for method ${message.method}`, err);
        this.sendError(id, -32603, (err as Error)?.message ?? "Internal error");
      }
    }
  }

  private handleNotification(message: RpcNotification): void {
    if (message.method === "client/log") {
      this.logDebug(`client/log: ${JSON.stringify(message.params)}`);
      return;
    }
    // Ignore other notifications for now
    this.logDebug(`Ignoring notification ${message.method}`);
  }

  private async dispatch(method: string, params: unknown): Promise<unknown> {
    switch (method) {
      case "initialize":
        return this.handleInitialize(params);
      case "tools/list":
        this.ensureInitialized(method);
        return { tools: memphisToolDefinitions };
      case "tools/call":
        this.ensureInitialized(method);
        return this.handleToolCall(params);
      case "ping":
        return { timestamp: new Date().toISOString() };
      case "shutdown":
        this.ensureInitialized(method);
        this.shuttingDown = true;
        return null;
      case "exit":
        this.stop();
        return null;
      default:
        throw new RpcError(-32601, `Method not found: ${method}`);
    }
  }

  private ensureInitialized(method: string): void {
    if (!this.initialized) {
      throw new RpcError(-32002, `Cannot call '${method}' before initialize`);
    }
  }

  private handleInitialize(params: unknown): unknown {
    if (this.initialized) {
      return {
        protocolVersion: this.protocolVersion,
        capabilities: { tools: {} },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      };
    }
    const info = ensureObject(params, "initialize.params");
    const client = ensureObject(info.clientInfo ?? {}, "initialize.params.clientInfo");
    this.logDebug(`Client connected: ${client.name ?? "unknown"} ${client.version ?? ""}`.trim());
    this.initialized = true;
    this.sendNotification("notifications/server/ready", {
      message: "Memphis MCP server ready",
    });
    return {
      protocolVersion: this.protocolVersion,
      capabilities: { tools: {} },
      serverInfo: {
        name: SERVER_NAME,
        version: SERVER_VERSION,
      },
    };
  }

  private async handleToolCall(params: unknown): Promise<ToolResult> {
    const obj = ensureObject(params, "tools/call.params");
    const name = readRequiredString(obj, "name");
    const handler = this.toolHandlers[name as MemphisToolName];
    if (!handler) {
      throw new RpcError(-32602, `Unknown tool '${name}'`);
    }
    const args = obj.arguments ?? {};
    try {
      return await handler(args);
    } catch (err) {
      if (err instanceof RpcError) {
        throw err;
      }
      this.logError(`Tool ${name} failed`, err);
      return {
        isError: true,
        content: [{
          type: "text",
          text: (err as Error)?.message ?? "Unknown error",
        }],
      };
    }
  }

  private async handleSearchTool(input: unknown): Promise<ToolResult> {
    const params = this.parseSearchInput(input);
    const recallQuery: RecallQuery = {
      text: params.query,
      chain: params.chain,
      type: params.type,
      tag: params.tag,
      since: params.since,
      until: params.until,
      limit: params.limit,
      includeVault: params.includeVault,
    };
    const semanticOptions = {
      semanticWeight: params.semanticWeight,
      semanticOnly: params.semanticOnly,
    };
    const result = await recall(this.ctx.guard, recallQuery, semanticOptions);
    const hits = result.hits.map(hit => ({
      chain: hit.chain,
      index: hit.index,
      timestamp: hit.timestamp,
      type: hit.type,
      tags: hit.tags,
      score: Number(hit.score.toFixed(4)),
      snippet: hit.snippet,
    }));
    return {
      content: [{
        type: "json",
        json: {
          tool: "memphis.search",
          total: hits.length,
          hits,
        },
      }],
    };
  }

  private async handleRecallTool(input: unknown): Promise<ToolResult> {
    const params = this.parseRecallInput(input);
    const recallQuery: RecallQuery = {
      text: params.query,
      chain: params.chain,
      type: params.type,
      tag: params.tag,
      since: params.since,
      until: params.until,
      limit: params.limit,
      includeVault: params.includeVault,
    };
    const result = await recall(this.ctx.guard, recallQuery);
    const blocks = result.hits.map(hit => ({
      chain: hit.chain,
      index: hit.index,
      timestamp: hit.timestamp,
      type: hit.type,
      tags: hit.tags,
      score: Number(hit.score.toFixed(4)),
      content: hit.content,
    }));
    return {
      content: [{
        type: "json",
        json: {
          tool: "memphis.recall",
          total: blocks.length,
          blocks,
        },
      }],
    };
  }

  private async handleDecisionTool(input: unknown): Promise<ToolResult> {
    const params = this.parseDecisionInput(input);
    const options = params.options?.length ? params.options : [params.chosen, "keep current direction"];
    const decision = createDecisionV1({
      title: params.title,
      options,
      chosen: params.chosen,
      reasoning: params.reasoning ?? "",
      context: params.context ?? "",
      links: params.links ?? [],
      confidence: params.confidence,
      mode: params.mode,
      scope: params.scope,
      status: params.status,
      decisionId: params.decisionId,
      supersedes: params.supersedes,
      evidence: params.mode === "inferred" && params.evidenceRefs?.length
        ? { refs: params.evidenceRefs, note: params.evidenceNote }
        : undefined,
    });
    const tags = new Set<string>([
      "decision",
      decision.mode,
      decision.scope,
      decision.status,
      ...(params.tags ?? []),
    ].filter(Boolean) as string[]);
    const block = await this.ctx.guard.appendBlock("decisions", {
      type: "decision",
      content: JSON.stringify(decision),
      tags: Array.from(tags),
      agent: "mcp",
    });
    return {
      content: [{
        type: "json",
        json: {
          tool: "memphis.decision.create",
          decision,
          block: summarizeBlock(block),
        },
      }],
    };
  }

  private async handleJournalTool(input: unknown): Promise<ToolResult> {
    const params = this.parseJournalInput(input);
    const chain = params.chain ?? "journal";
    const blockType = params.type ?? "journal";
    const tags = Array.from(new Set([...(params.tags ?? []), blockType]));
    const block = await this.ctx.guard.appendBlock(chain, {
      type: blockType as Block["data"]["type"],
      content: params.content.trim(),
      tags,
      agent: params.agent ?? "mcp",
    });
    return {
      content: [{
        type: "json",
        json: {
          tool: "memphis.journal.add",
          block: summarizeBlock(block),
        },
      }],
    };
  }

  private async handleStatusTool(input: unknown): Promise<ToolResult> {
    const params = this.parseStatusInput(input);
    const report = buildStatusReport(this.ctx.guard, this.ctx.config);
    const payload = params.verbose
      ? report
      : {
          ...report,
          embeddings: {
            ...report.embeddings,
            summaries: report.embeddings.summaries.slice(0, 5),
          },
          chains: report.chains.slice(0, 10),
        };
    return {
      content: [{
        type: "json",
        json: {
          tool: "memphis.status",
          report: payload,
        },
      }],
    };
  }

  private sendResponse(id: RpcId, result: unknown): void {
    this.transport.send({ jsonrpc: JSONRPC_VERSION, id, result });
  }

  private sendError(id: RpcId, code: number, message: string, data?: unknown): void {
    this.transport.send({ jsonrpc: JSONRPC_VERSION, id, error: { code, message, data } });
  }

  private sendNotification(method: string, params: unknown): void {
    this.transport.send({ jsonrpc: JSONRPC_VERSION, method, params });
  }

  private logDebug(message: string): void {
    if (this.debugEnabled) {
      this.stderr.write(`[mcp] ${message}\n`);
    }
  }

  private logError(message: string, err?: unknown): void {
    const suffix = err ? `: ${(err as Error)?.message ?? String(err)}` : "";
    this.stderr.write(`[mcp] ${message}${suffix}\n`);
  }

  private parseSearchInput(input: unknown): MemphisSearchInput {
    const obj = ensureObject(input, "memphis.search.arguments");
    const query = readRequiredString(obj, "query");
    const limit = readOptionalNumber(obj, "limit", { min: 1, max: 200, defaultValue: 20 });
    const semanticWeight = readOptionalNumber(obj, "semanticWeight", { min: 0, max: 1, defaultValue: undefined });
    return {
      query,
      chain: readOptionalString(obj, "chain"),
      type: readOptionalString(obj, "type"),
      tag: readOptionalString(obj, "tag"),
      since: readOptionalString(obj, "since"),
      until: readOptionalString(obj, "until"),
      includeVault: readOptionalBoolean(obj, "includeVault"),
      semanticOnly: readOptionalBoolean(obj, "semanticOnly"),
      limit,
      semanticWeight,
    };
  }

  private parseRecallInput(input: unknown): MemphisRecallInput {
    const obj = ensureObject(input, "memphis.recall.arguments");
    const limit = readOptionalNumber(obj, "limit", { min: 1, max: 200, defaultValue: 20 });
    return {
      query: readOptionalString(obj, "query"),
      chain: readOptionalString(obj, "chain"),
      type: readOptionalString(obj, "type"),
      tag: readOptionalString(obj, "tag"),
      since: readOptionalString(obj, "since"),
      until: readOptionalString(obj, "until"),
      limit,
      includeVault: readOptionalBoolean(obj, "includeVault"),
    };
  }

  private parseDecisionInput(input: unknown): MemphisDecisionCreateInput {
    const obj = ensureObject(input, "memphis.decision.create.arguments");
    const title = readRequiredString(obj, "title");
    const chosen = readRequiredString(obj, "chosen");
    const confidence = readOptionalNumber(obj, "confidence", { min: 0, max: 1 });
    return {
      title,
      chosen,
      options: readOptionalStringArray(obj, "options"),
      reasoning: readOptionalString(obj, "reasoning"),
      context: readOptionalString(obj, "context"),
      tags: readOptionalStringArray(obj, "tags"),
      links: readOptionalStringArray(obj, "links"),
      confidence,
      mode: readOptionalEnum(obj, "mode", ["conscious", "inferred"]),
      scope: readOptionalEnum(obj, "scope", ["personal", "project", "life"]),
      status: readOptionalEnum(obj, "status", ["active", "revised", "deprecated", "contradicted"]),
      decisionId: readOptionalString(obj, "decisionId"),
      supersedes: readOptionalString(obj, "supersedes"),
      evidenceRefs: readOptionalStringArray(obj, "evidenceRefs"),
      evidenceNote: readOptionalString(obj, "evidenceNote"),
    };
  }

  private parseJournalInput(input: unknown): MemphisJournalAddInput {
    const obj = ensureObject(input, "memphis.journal.add.arguments");
    const content = readRequiredString(obj, "content");
    return {
      content,
      tags: readOptionalStringArray(obj, "tags"),
      chain: readOptionalString(obj, "chain"),
      type: readOptionalString(obj, "type"),
      agent: readOptionalString(obj, "agent"),
    };
  }

  private parseStatusInput(input: unknown): MemphisStatusInput {
    if (input === undefined) return {};
    const obj = ensureObject(input, "memphis.status.arguments");
    return {
      verbose: readOptionalBoolean(obj, "verbose"),
    };
  }
}

type AnyRecord = Record<string, unknown>;

function ensureObject(value: unknown, context: string): AnyRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new RpcError(-32602, `${context} must be an object`);
  }
  return value as AnyRecord;
}

function readRequiredString(obj: AnyRecord, key: string): string {
  const value = obj[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new RpcError(-32602, `Field '${key}' is required and must be a non-empty string`);
  }
  return value.trim();
}

function readOptionalString(obj: AnyRecord, key: string): string | undefined {
  const value = obj[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string") {
    throw new RpcError(-32602, `Field '${key}' must be a string`);
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readOptionalBoolean(obj: AnyRecord, key: string): boolean | undefined {
  const value = obj[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "boolean") {
    throw new RpcError(-32602, `Field '${key}' must be a boolean`);
  }
  return value;
}

function readOptionalNumber(
  obj: AnyRecord,
  key: string,
  opts: { min?: number; max?: number; defaultValue?: number } = {},
): number | undefined {
  const value = obj[key];
  if (value === undefined || value === null) return opts.defaultValue;
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new RpcError(-32602, `Field '${key}' must be a number`);
  }
  if (opts.min !== undefined && value < opts.min) {
    throw new RpcError(-32602, `Field '${key}' must be >= ${opts.min}`);
  }
  if (opts.max !== undefined && value > opts.max) {
    throw new RpcError(-32602, `Field '${key}' must be <= ${opts.max}`);
  }
  return value;
}

function readOptionalEnum<T extends string>(obj: AnyRecord, key: string, allowed: T[]): T | undefined {
  const value = obj[key];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new RpcError(-32602, `Field '${key}' must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

function readOptionalStringArray(obj: AnyRecord, key: string): string[] | undefined {
  const value = obj[key];
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value)) {
    throw new RpcError(-32602, `Field '${key}' must be an array of strings`);
  }
  const arr = value.map((item, idx) => {
    if (typeof item !== "string") {
      throw new RpcError(-32602, `Field '${key}' index ${idx} must be a string`);
    }
    return item.trim();
  }).filter(Boolean);
  return arr.length ? arr : undefined;
}

function summarizeBlock(block: Block) {
  return {
    chain: block.chain,
    index: block.index,
    timestamp: block.timestamp,
    hash: block.hash,
    type: block.data.type,
    tags: block.data.tags,
  };
}
