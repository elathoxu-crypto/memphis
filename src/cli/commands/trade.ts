import { Command } from "commander";
import chalk from "chalk";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { Block } from "../../memory/chain.js";
import type { IStore } from "../../memory/store.js";
import { createWorkspaceStore } from "../utils/workspace-store.js";
import {
  TradeManifest,
  TradeOffer,
  TradeBlockRange,
  validateTradeOffer,
  signManifest,
  verifyManifest,
} from "../../trade/protocol.js";

interface TradeCreateOptions {
  blocks: string;
  ttl: string;
  usage?: string;
  sender?: string;
  out?: string;
}

interface TradeAcceptOptions {
  as?: string;
}

interface TradeListOptions {
  all?: boolean;
}

export function registerTradeCommand(program: Command): void {
  const tradeProgram = program.command("trade").description("Agent trade negotiation protocol");

  tradeProgram
    .command("create <recipientDid>")
    .description("Create a signed trade manifest")
    .requiredOption("--blocks <chain:from-to>", "Blocks to include, e.g. journal:10-20")
    .requiredOption("--ttl <days>", "Time-to-live for the offer in days")
    .option("--usage <rights>", "Usage rights clause", "read-only")
    .option("--sender <did>", "Override local DID for the sender")
    .option("--out <path>", "Manifest output file path")
    .action(async (recipientDid: string, options: TradeCreateOptions) => {
      await runTradeTask(() => handleCreate(recipientDid, options));
    });

  tradeProgram
    .command("accept <manifestFile>")
    .description("Accept a trade manifest and record the agreement")
    .option("--as <did>", "Override local DID for acceptance")
    .action(async (manifestFile: string, options: TradeAcceptOptions) => {
      await runTradeTask(() => handleAccept(manifestFile, options));
    });

  tradeProgram
    .command("list")
    .description("Show pending trade offers")
    .option("--all", "Show all offers, including accepted ones")
    .action(async (options: TradeListOptions) => {
      await runTradeTask(() => handleList(Boolean(options.all)));
    });

  tradeProgram
    .command("verify <manifestFile>")
    .description("Verify a manifest signature without recording it")
    .action(async (manifestFile: string) => {
      await runTradeTask(() => handleVerify(manifestFile));
    });
}

async function runTradeTask(task: () => Promise<void>): Promise<void> {
  try {
    await task();
  } catch (error: any) {
    const message = error?.message || String(error);
    console.log(chalk.red(`[trade] ${message}`));
    process.exitCode = 1;
  }
}

function parseBlockRanges(input: string): TradeBlockRange[] {
  const segments = input.split(",").map(seg => seg.trim()).filter(Boolean);
  if (segments.length === 0) {
    throw new Error("--blocks must include at least one segment");
  }
  return segments.map(segment => {
    const [chainPart, rangePart] = segment.split(":");
    if (!chainPart || !rangePart) {
      throw new Error(`Invalid block segment '${segment}'. Use chain:from-to`);
    }
    const [fromRaw, toRaw] = rangePart.split("-");
    const from = Number.parseInt(fromRaw, 10);
    const to = Number.parseInt(toRaw ?? fromRaw, 10);
    if (!Number.isFinite(from)) {
      throw new Error(`Invalid from index in segment '${segment}'`);
    }
    if (!Number.isFinite(to)) {
      throw new Error(`Invalid to index in segment '${segment}'`);
    }
    return {
      chain: chainPart.trim(),
      from,
      to: Math.max(from, to),
    } satisfies TradeBlockRange;
  });
}

function formatRange(range: TradeBlockRange): string {
  return `${range.chain}:${range.from}-${range.to}`;
}

function resolveLocalDid(store: IStore, override?: string): string {
  if (override) return override;
  if (process.env.MEMPHIS_DID) return process.env.MEMPHIS_DID;

  try {
    const vaultBlocks = store.readChain("vault");
    for (const block of vaultBlocks) {
      const didTag = block.data.tags?.find(tag => tag.startsWith("did:"));
      if (didTag) return didTag;
    }
  } catch {
    // ignore lookup errors and fall through to failure
  }

  throw new Error("Unable to determine local DID. Pass --sender/--as or set MEMPHIS_DID");
}

async function handleCreate(recipientDid: string, options: TradeCreateOptions): Promise<void> {
  const { guard } = createWorkspaceStore();
  const ttl = Number.parseInt(options.ttl, 10);
  if (!Number.isFinite(ttl) || ttl <= 0) {
    throw new Error("--ttl must be a positive integer");
  }

  const ranges = parseBlockRanges(options.blocks);
  const senderDid = resolveLocalDid(guard, options.sender);
  const offer: TradeOffer = {
    senderDid,
    recipientDid,
    blocks: ranges,
    ttlDays: ttl,
    usageRights: options.usage?.trim() || "read-only",
  };

  const validation = validateTradeOffer(offer);
  if (!validation.valid) {
    validation.errors.forEach(err => console.log(chalk.red(`✗ ${err}`)));
    throw new Error("Trade offer validation failed");
  }

  const manifest = signManifest(offer);
  const manifestPath = await writeManifestToFile(manifest, options.out);

  await guard.appendBlock("trade", {
    type: "trade",
    content: `offer ${senderDid} → ${recipientDid} (${ranges.map(formatRange).join(", ")})`,
    tags: ["trade", "offer", `to:${recipientDid}`],
    agent: senderDid,
    data: {
      event: "offer_created",
      manifestId: manifest.id,
      manifestPath,
      manifest,
    },
  });

  console.log(chalk.green("✓ Trade manifest created"));
  console.log(`  file     : ${manifestPath}`);
  console.log(`  manifest : ${manifest.id}`);
  console.log(`  expires  : ${manifest.expiresAt}`);
}

async function handleAccept(manifestFile: string, options: TradeAcceptOptions): Promise<void> {
  const manifest = await loadManifestFromFile(manifestFile);
  if (!verifyManifest(manifest)) {
    throw new Error("Manifest signature verification failed");
  }

  const { guard } = createWorkspaceStore();
  const localDid = resolveLocalDid(guard, options.as);

  if (localDid !== manifest.offer.recipientDid) {
    console.log(chalk.yellow("⚠ Recipient DID mismatch – proceeding anyway"));
  }

  if (new Date(manifest.expiresAt).getTime() < Date.now()) {
    console.log(chalk.yellow("⚠ Manifest is past its TTL"));
  }

  await guard.appendBlock("trade", {
    type: "trade",
    content: `accept ${manifest.offer.senderDid} → ${manifest.offer.recipientDid}`,
    tags: ["trade", "accept", `manifest:${manifest.id}`],
    agent: localDid,
    data: {
      event: "offer_accepted",
      manifestId: manifest.id,
      manifest,
    },
  });

  console.log(chalk.green("✓ Trade manifest accepted"));
  console.log(`  manifest : ${manifest.id}`);
  console.log(`  accepted : ${new Date().toISOString()}`);
}

async function handleList(showAll: boolean): Promise<void> {
  const { guard } = createWorkspaceStore();
  let blocks: Block[] = [];
  try {
    blocks = guard.readChain("trade");
  } catch {
    blocks = [];
  }

  type OfferState = {
    manifest: TradeManifest;
    createdAt: string;
    createdBy?: string;
    acceptedAt?: string;
    acceptedBy?: string;
    status: "pending" | "accepted";
  };

  const offers = new Map<string, OfferState>();

  for (const block of blocks) {
    const payload = block.data.data as Record<string, any> | undefined;
    if (!payload || typeof payload !== "object") continue;
    if (payload.event === "offer_created" && payload.manifest) {
      const manifest: TradeManifest = payload.manifest;
      offers.set(payload.manifestId ?? manifest.id, {
        manifest,
        createdAt: block.timestamp,
        createdBy: block.data.agent,
        status: "pending",
      });
    } else if (payload.event === "offer_accepted") {
      const manifest: TradeManifest | undefined = payload.manifest;
      const manifestId: string | undefined = payload.manifestId ?? manifest?.id;
      if (!manifestId || !manifest) continue;
      const state = offers.get(manifestId) ?? {
        manifest,
        createdAt: block.timestamp,
        status: "pending",
      };
      state.status = "accepted";
      state.acceptedAt = block.timestamp;
      state.acceptedBy = block.data.agent;
      state.manifest = manifest;
      offers.set(manifestId, state);
    }
  }

  const rows = Array.from(offers.values())
    .filter(entry => showAll || entry.status === "pending")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(entry => ({
      Manifest: entry.manifest.id,
      Sender: entry.manifest.offer.senderDid,
      Recipient: entry.manifest.offer.recipientDid,
      Blocks: entry.manifest.offer.blocks.map(formatRange).join(", "),
      Usage: entry.manifest.offer.usageRights,
      Expires: entry.manifest.expiresAt,
      Status: entry.status,
    }));

  if (rows.length === 0) {
    console.log(chalk.gray(showAll ? "No trade offers recorded." : "No pending trade offers."));
    return;
  }

  console.table(rows);
}

async function handleVerify(manifestFile: string): Promise<void> {
  const manifest = await loadManifestFromFile(manifestFile);
  const offerCheck = validateTradeOffer(manifest.offer);
  if (!offerCheck.valid) {
    offerCheck.errors.forEach(err => console.log(chalk.red(`✗ ${err}`)));
    throw new Error("Manifest offer is invalid");
  }

  if (verifyManifest(manifest)) {
    console.log(chalk.green("✓ Manifest signature is valid"));
  } else {
    throw new Error("Manifest signature is invalid");
  }
}

async function writeManifestToFile(manifest: TradeManifest, requestedPath?: string): Promise<string> {
  const targetPath = path.resolve(requestedPath ?? `trade-manifest-${manifest.id}.json`);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, JSON.stringify(manifest, null, 2), { mode: 0o600 });
  return targetPath;
}

async function loadManifestFromFile(filePath: string): Promise<TradeManifest> {
  const resolved = path.resolve(filePath);
  const raw = await fs.readFile(resolved, "utf-8");
  const parsed = JSON.parse(raw);
  if (!parsed?.offer || !parsed.signature) {
    throw new Error("File does not contain a trade manifest");
  }
  return parsed as TradeManifest;
}
