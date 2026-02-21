import chalk from "chalk";
import { Store } from "../../memory/store.js";
import { createBlock } from "../../memory/chain.js";
import { encrypt, decrypt, generateDID } from "../../utils/crypto.js";
import { loadConfig } from "../../config/loader.js";
import { sha256 } from "../../utils/hash.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { promptHidden, readStdinTrimmed } from "../utils/prompt.js";

interface VaultOptions {
  action: "add" | "list" | "get" | "delete" | "init";
  key?: string;
  value?: string;
  password?: string;
  passwordEnv?: string;
  passwordStdin?: boolean;
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
  const config = loadConfig();
  const store = new Store(config.memory?.path || `${process.env.HOME}/.memphis/chains`);
  const chain = "vault";

  switch (opts.action) {
    case "init": {
      // Initialize vault chain with genesis
      const existing = store.readChain(chain);
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
      
      await store.appendBlock(chain, {
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
      const chainBlocks = store.readChain(chain).filter(b => b.data.type === "vault" && b.data.content);

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

    case "get": {
      if (!opts.key) {
        console.log(chalk.red("Usage: memphis vault get <key> (prompts) | --password-env VAR | --password-stdin"));
        return;
      }

      const blocks = store.readChain(chain)
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
      await store.appendBlock(chain, {
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

    default:
      console.log(chalk.red("Unknown action. Use: init, add, list, get, delete"));
  }
}
