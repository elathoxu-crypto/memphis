import chalk from "chalk";
import { createBlock } from "../../memory/chain.js";
import { encrypt, decrypt, generateDID } from "../../utils/crypto.js";
import { sha256 } from "../../utils/hash.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { promptHidden, readStdinTrimmed } from "../utils/prompt.js";
import { createWorkspaceStore } from "../utils/workspace-store.js";

interface VaultOptions {
  action: "add" | "list" | "get" | "delete" | "init" | "export" | "backup" | "recover";
  key?: string;
  value?: string;
  password?: string;
  passwordEnv?: string;
  passwordStdin?: boolean;
  json?: boolean;
  seed?: string;
  shares?: string[];
  threshold?: number;
}


async function resolveVaultPassword(opts: VaultOptions): Promise<string> {
  if (opts.passwordEnv) {
    const v = process.env[opts.passwordEnv];
    if (!v) throw new Error(`Environment variable '${opts.passwordEnv}' is not set`);
    return v;
  }
  if (opts.passwordStdin) {
    const v = await readStdinTrimmed();
    if (!v) throw new Error("No password provided on stdin");
    return v;
  }
  return await promptHidden("Vault password: ");
}

export async function vaultCommand(opts: VaultOptions): Promise<void> {
  const { config, store, guard } = createWorkspaceStore();
  const chain = "vault";

  switch (opts.action) {
    case "init": {
      // Initialize vault chain with genesis
      const existing = guard.readChain(chain);
      if (existing.length > 0) {
        console.log(chalk.yellow("Vault already initialized!"));
        return;
      }
      
      const did = generateDID();
      const basePath = config.memory?.path || `${process.env.HOME}/.memphis/chains`;
      
      // Create genesis block properly
      const genesisData = {
        type: "vault" as const,
        content: "Vault genesis block",
        tags: ["genesis", did],
        encrypted: "",
        key_id: did,
      };
      
      const genesisBlock = createBlock(chain, genesisData);
      
      // Fix genesis: prev_hash should be all zeros
      const fixedGenesis = {
        ...genesisBlock,
        prev_hash: "0".repeat(64),
      };
      
      // Recompute hash with correct prev_hash
      const { hash, ...rest } = fixedGenesis;
      const recomputedHash = sha256(JSON.stringify(rest));
      const finalGenesis = { ...rest, hash: recomputedHash };
      
      // Write directly to file
      const vaultDir = join(basePath, chain);
      mkdirSync(vaultDir, { recursive: true, mode: 0o700 });
      writeFileSync(join(vaultDir, "000000.json"), JSON.stringify(finalGenesis, null, 2), { mode: 0o600 });
      
      console.log(chalk.green("✓ Vault initialized!"));
      console.log(chalk.cyan("Your DID: " + did));
      console.log(chalk.gray("Store this securely - it's your identity!"));
      break;
    }

    case "add": {
      if (!opts.key || !opts.value) {
        console.log(chalk.red("Usage: memphis vault add <key> <value> (prompts) | --password-env VAR | --password-stdin"));
        return;
      }

      const password = await resolveVaultPassword(opts);
      const encrypted = encrypt(opts.value, password);
      
      await guard.appendBlock(chain, {
        type: "vault",
        content: opts.key,
        tags: ["secret", opts.key],
        encrypted,
        key_id: opts.key,
      });

      console.log(chalk.green(`✓ Added secret: ${opts.key}`));
      break;
    }

    case "list": {
      const chainBlocks = guard.readChain(chain).filter(b => b.data.type === "vault" && b.data.content);

      // Determine latest state per key (append-only)
      const latestByKey = new Map<string, (typeof chainBlocks)[number]>();
      for (const b of chainBlocks) {
        latestByKey.set(b.data.content, b);
      }

      const activeKeys = [...latestByKey.entries()]
        .filter(([_, b]) => !(b.data as any).revoked)
        .map(([k]) => k)
        .sort();

      if (activeKeys.length === 0) {
        console.log(chalk.yellow("No active secrets found. Run 'memphis vault init' first."));
        return;
      }

      console.log(chalk.bold("\n🔐 Stored Secrets (active):\n"));
      activeKeys.forEach(key => console.log(chalk.cyan(`  • ${key}`)));
      console.log("");
      break;
    }

    case "export": {
      const chainBlocks = guard.readChain(chain).filter(b => b.data.type === "vault" && b.data.content);

      if (chainBlocks.length === 0) {
        console.log(chalk.yellow("Vault is empty. Run 'memphis vault init' and add secrets first."));
        return;
      }

      type VaultExportEntry = {
        key: string;
        createdAt: string;
        updatedAt: string;
        versions: number;
        revoked: boolean;
        tags: string[];
        lastBlockIndex: number;
      };

      const exportMap = new Map<string, VaultExportEntry>();

      for (const block of chainBlocks) {
        const keyName = block.data.content!;
        const existing = exportMap.get(keyName);
        const tags = Array.isArray(block.data.tags) ? block.data.tags : [];
        if (!existing) {
          exportMap.set(keyName, {
            key: keyName,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            versions: 1,
            revoked: Boolean((block.data as any).revoked),
            tags: [...tags],
            lastBlockIndex: block.index,
          });
          continue;
        }

        existing.updatedAt = block.timestamp;
        existing.versions += 1;
        existing.revoked = Boolean((block.data as any).revoked);
        existing.lastBlockIndex = block.index;
        existing.tags = Array.from(new Set([...existing.tags, ...tags]));
      }

      const exportData = [...exportMap.values()].sort((a, b) => a.key.localeCompare(b.key));

      if (opts.json) {
        console.log(JSON.stringify(exportData, null, 2));
      } else {
        console.log(chalk.bold("\n🔐 Vault Export (metadata only)\n"));
        for (const entry of exportData) {
          console.log(chalk.cyan(`• ${entry.key}`));
          console.log(`    status   : ${entry.revoked ? chalk.yellow("revoked") : chalk.green("active")}`);
          console.log(`    versions : ${entry.versions}`);
          console.log(`    created  : ${entry.createdAt}`);
          console.log(`    updated  : ${entry.updatedAt}`);
          console.log(`    block #  : ${entry.lastBlockIndex}`);
          if (entry.tags.length > 0) {
            console.log(`    tags     : ${entry.tags.join(", ")}`);
          }
          console.log("");
        }
      }

      console.log(chalk.gray("Reminder: this export only lists metadata. Store the file securely if you redirect it to disk."));
      break;
    }

    case "get": {
      if (!opts.key) {
        console.log(chalk.red("Usage: memphis vault get <key> (prompts) | --password-env VAR | --password-stdin"));
        return;
      }

      const blocks = guard.readChain(chain)
        .filter(b => b.data.type === "vault" && b.data.content === opts.key);

      if (blocks.length === 0) {
        console.log(chalk.red(`Secret '${opts.key}' not found!`));
        return;
      }

      const latest = blocks[blocks.length - 1];
      if ((latest.data as any).revoked) {
        console.log(chalk.yellow(`Secret '${opts.key}' is revoked.`));
        return;
      }
      if (!latest.data.encrypted) {
        console.log(chalk.red(`Secret '${opts.key}' has no encrypted payload.`));
        return;
      }

      try {
        const password = await resolveVaultPassword(opts);
        const secret = decrypt(latest.data.encrypted!, password);
        console.log(chalk.green(`\n🔑 ${opts.key}:\n`));
        console.log(chalk.white(secret));
        console.log("");
      } catch (e) {
        console.log(chalk.red("✗ Wrong password or corrupted data!"));
      }
      break;
    }

    case "delete": {
      if (!opts.key) {
        console.log(chalk.red("Usage: memphis vault delete <key>"));
        return;
      }

      // Append-only revocation block (does not erase history)
      await guard.appendBlock(chain, {
        type: "vault",
        content: opts.key,
        tags: ["revoked", opts.key],
        revoked: true,
        key_id: opts.key,
      } as any);

      console.log(chalk.yellow(`⚠ Revoked secret: ${opts.key}`));
      console.log(chalk.gray("Note: append-only chain; historical encrypted blocks remain on disk."));
      break;
    }

    case "backup": {
      const { generateSeedPhrase, formatSeedPhrase, deriveRecoveryKey } = await import("../../utils/recovery.js");
      const password = await resolveVaultPassword(opts);

      // Generate recovery seed
      const seed = generateSeedPhrase();

      // Derive recovery key
      const { salt } = deriveRecoveryKey(seed);

      console.log();
      console.log(chalk.bold.yellow("⚠️  RECOVERY SEED PHRASE"));
      console.log(chalk.dim("   Store this securely! Anyone with this phrase can recover your vault."));
      console.log();
      console.log(chalk.white(formatSeedPhrase(seed)));
      console.log();
      console.log(chalk.dim("   Salt: " + salt));
      console.log();

      // Store salt in vault for recovery
      await guard.appendBlock(chain, {
        type: "vault",
        content: "recovery-salt",
        tags: ["recovery", "setup"],
        encrypted: salt,
        key_id: "recovery-salt",
      } as any);

      console.log(chalk.green("✓ Recovery seed generated and salt stored."));
      console.log(chalk.gray("  Use: memphis vault recover --seed \"<phrase>\""));
      break;
    }

    case "recover": {
      const { deriveRecoveryKey, validateSeedPhrase } = await import("../../utils/recovery.js");

      if (!opts.seed) {
        console.log(chalk.red("Usage: memphis vault recover --seed \"<word1 word2 ... word24>\""));
        console.log(chalk.dim("  Provide your 24-word recovery seed phrase."));
        process.exit(1);
      }

      // Validate seed
      if (!validateSeedPhrase(opts.seed)) {
        console.log(chalk.red("✗ Invalid seed phrase. Must be 12 or 24 words."));
        process.exit(1);
      }

      // Find recovery salt
      const blocks = guard.readChain(chain);
      const saltBlock = blocks.find(b => (b.data as any).key_id === "recovery-salt" && !(b.data as any).revoked);

      if (!saltBlock) {
        console.log(chalk.red("✗ No recovery salt found. Did you run 'vault export' first?"));
        process.exit(1);
      }

      const salt = (saltBlock.data as any).encrypted;

      // Derive key from seed
      const { key } = deriveRecoveryKey(opts.seed, salt);

      console.log();
      console.log(chalk.green("✓ Recovery key derived from seed phrase."));
      console.log(chalk.dim("  You can now use this password to access your vault."));
      console.log();
      console.log(chalk.cyan("Recovery password: ") + key.toString("hex"));
      console.log();
      console.log(chalk.yellow("⚠️  Store this password securely!"));
      console.log();

      break;
    }

    default:
      console.log(chalk.red("Unknown action. Use: init, add, list, get, delete"));
  }
}
