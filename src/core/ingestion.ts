/**
 * Ingestion Service — imports external content into Memphis as blocks.
 *
 * Supported formats:
 *   .md / .txt / .markdown  — plain text / markdown
 *   .json / .jsonl          — structured data (content field extracted)
 *   .pdf                    — text extraction via pdftotext (if installed)
 *
 * Pipeline:
 *   file → read → chunk → embed (optional) → store as blocks
 *
 * Each ingested file gets a source tag: "ingest:<basename>"
 * and a "source" tag for the file type.
 * Duplicate detection: skip if content hash already exists in chain.
 */

import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { extname, basename, resolve } from "node:path";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";
import { Store } from "../memory/store.js";
import { chunk, type ChunkOptions } from "./chunker.js";
import { EmbeddingService } from "../embeddings/service.js";
import { LocalOllamaBackend } from "../embeddings/backends/local.js";
import type { Block } from "../memory/chain.js";

export interface IngestOptions {
  chain?: string;           // target chain (default: "journal")
  tags?: string[];          // extra tags to attach
  chunkOptions?: ChunkOptions;
  embed?: boolean;          // also embed after ingestion (default: false)
  dryRun?: boolean;
  recursive?: boolean;      // recurse into subdirs
  skipDuplicates?: boolean; // default: true
  source?: string;          // override source label
}

export interface IngestResult {
  file: string;
  chunks: number;
  skipped: number;
  embedded: number;
  blockIndices: number[];
  durationMs: number;
  error?: string;
}

export interface IngestStats {
  files: number;
  totalChunks: number;
  totalSkipped: number;
  totalEmbedded: number;
  results: IngestResult[];
  durationMs: number;
}

// ─── Readers ────────────────────────────────────────────────────────────────

function readText(filePath: string): string {
  return readFileSync(filePath, "utf-8");
}

function readJson(filePath: string): string {
  const raw = JSON.parse(readFileSync(filePath, "utf-8"));
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw)) {
    return raw.map((item: any) => {
      if (typeof item === "string") return item;
      return item.content ?? item.text ?? item.message ?? JSON.stringify(item);
    }).join("\n\n");
  }
  return raw.content ?? raw.text ?? raw.body ?? JSON.stringify(raw, null, 2);
}

function readJsonl(filePath: string): string {
  return readFileSync(filePath, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map(line => {
      try {
        const obj = JSON.parse(line);
        return obj.content ?? obj.text ?? obj.message ?? line;
      } catch {
        return line;
      }
    })
    .join("\n\n");
}

function readPdf(filePath: string): string {
  try {
    return execSync(`pdftotext "${filePath}" -`, { encoding: "utf-8", timeout: 10000 });
  } catch {
    throw new Error("PDF extraction failed — install pdftotext (poppler-utils)");
  }
}

function extractText(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case ".md":
    case ".txt":
    case ".markdown":
    case ".rst":
      return readText(filePath);
    case ".json":
      return readJson(filePath);
    case ".jsonl":
      return readJsonl(filePath);
    case ".pdf":
      return readPdf(filePath);
    default:
      // Try as plain text
      return readText(filePath);
  }
}

// ─── Duplicate detection ─────────────────────────────────────────────────────

function contentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 16);
}

function buildExistingHashes(store: Store, chain: string): Set<string> {
  const hashes = new Set<string>();
  try {
    const blocks = store.readChain(chain);
    for (const block of blocks) {
      if (block.data.tags?.some(t => t.startsWith("ingest:"))) {
        // Strip the "[ingest: ...]" header line before hashing (nested brackets safe)
        const body = block.data.content.replace(/^\[ingest:[^\n]+\n\n/, "");
        hashes.add(contentHash(body));
        // Also hash the full content as fallback
        hashes.add(contentHash(block.data.content));
      }
    }
  } catch {
    // chain might not exist yet
  }
  return hashes;
}

// ─── Core ingestion ──────────────────────────────────────────────────────────

async function ingestFile(
  store: Store,
  filePath: string,
  options: IngestOptions,
  existingHashes: Set<string>,
): Promise<IngestResult> {
  const start = Date.now();
  const result: IngestResult = {
    file: filePath,
    chunks: 0,
    skipped: 0,
    embedded: 0,
    blockIndices: [],
    durationMs: 0,
  };

  let text: string;
  try {
    text = extractText(filePath);
  } catch (err: any) {
    result.error = err.message;
    result.durationMs = Date.now() - start;
    return result;
  }

  if (!text.trim()) {
    result.error = "Empty file";
    result.durationMs = Date.now() - start;
    return result;
  }

  const chain = options.chain ?? "journal";
  const sourceName = options.source ?? basename(filePath);
  const sourceTag = `ingest:${basename(filePath).replace(/[^a-z0-9._-]/gi, "_")}`;
  const extraTags = options.tags ?? [];
  const skipDuplicates = options.skipDuplicates !== false;

  const chunks = chunk(text, options.chunkOptions);

  for (const c of chunks) {
    const hash = contentHash(c.text);

    if (skipDuplicates && existingHashes.has(hash)) {
      result.skipped++;
      continue;
    }

    existingHashes.add(hash);
    result.chunks++;

    if (options.dryRun) continue;

    const chunkLabel = chunks.length > 1 ? ` [${c.index + 1}/${chunks.length}]` : "";
    const header = `[ingest: ${sourceName}${chunkLabel}]\n\n`;

    const block = await store.appendBlock(chain, {
      type: "journal",
      content: header + c.text,
      tags: ["ingest", sourceTag, ...extraTags],
    });

    result.blockIndices.push(block.index);
  }

  // Embed if requested
  if (options.embed && result.blockIndices.length > 0 && !options.dryRun) {
    try {
      const backend = new LocalOllamaBackend();
      const embeddingService = new EmbeddingService(store, backend);
      const blocks = store.readChain(chain).filter(b => result.blockIndices.includes(b.index));

      for (const block of blocks) {
        const vectors = await backend.embedBlocks([block]);
        if (vectors[0]) {
          result.embedded++;
        }
      }
    } catch {
      // embedding optional — don't fail ingestion
    }
  }

  result.durationMs = Date.now() - start;
  return result;
}

// ─── Public API ──────────────────────────────────────────────────────────────

function collectFiles(pathOrDir: string, recursive: boolean): string[] {
  const supported = new Set([
    ".md", ".txt", ".markdown", ".rst", ".json", ".jsonl", ".pdf",
    ".ts", ".tsx", ".js", ".jsx", ".py", ".rb", ".rs", ".go", ".java",
    ".c", ".cpp", ".cc", ".h", ".hpp", ".cs", ".swift", ".kt", ".m", ".mm",
    ".sh", ".bash", ".zsh", ".ps1", ".yaml", ".yml", ".toml", ".ini", ".cfg",
    ".conf", ".sql", ".html", ".css", ".scss", ".less", ".vue",
  ]);

  if (!existsSync(pathOrDir)) throw new Error(`Path not found: ${pathOrDir}`);

  const stat = statSync(pathOrDir);
  if (stat.isFile()) return [resolve(pathOrDir)];

  if (!stat.isDirectory()) throw new Error(`Not a file or directory: ${pathOrDir}`);

  const files: string[] = [];
  const entries = readdirSync(pathOrDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = resolve(pathOrDir, entry.name);
    if (entry.isFile() && supported.has(extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    } else if (entry.isDirectory() && recursive) {
      files.push(...collectFiles(fullPath, recursive));
    }
  }

  return files.sort();
}

export async function ingest(
  store: Store,
  pathOrDir: string,
  options: IngestOptions = {},
): Promise<IngestStats> {
  const start = Date.now();
  const chain = options.chain ?? "journal";

  const files = collectFiles(pathOrDir, options.recursive ?? false);
  const existingHashes = buildExistingHashes(store, chain);

  const results: IngestResult[] = [];

  for (const file of files) {
    const result = await ingestFile(store, file, options, existingHashes);
    results.push(result);
  }

  return {
    files: files.length,
    totalChunks: results.reduce((s, r) => s + r.chunks, 0),
    totalSkipped: results.reduce((s, r) => s + r.skipped, 0),
    totalEmbedded: results.reduce((s, r) => s + r.embedded, 0),
    results,
    durationMs: Date.now() - start,
  };
}
