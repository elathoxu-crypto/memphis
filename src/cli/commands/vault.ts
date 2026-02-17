import chalk from "chalk";
import { Store } from "../../memory/store.js";
import { createBlock } from "../../memory/chain.js";
import { encrypt, decrypt, generateDID } from "../../utils/crypto.js";
import { loadConfig } from "../../config/loader.js";
import { sha256 } from "../../utils/hash.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

interface VaultOptions {
  action: "add" | "list" | "get" | "delete" | "init";
  key?: string;
  value?: string;
  password?: string;
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
        iv: "0".repeat(24),
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
      mkdirSync(vaultDir, { recursive: true });
      writeFileSync(join(vaultDir, "000000.json"), JSON.stringify(finalGenesis, null, 2));
      
      console.log(chalk.green("✓ Vault initialized!"));
      console.log(chalk.cyan("Your DID: " + did));
      console.log(chalk.gray("Store this securely - it's your identity!"));
      break;
    }

    case "add": {
      if (!opts.key || !opts.value || !opts.password) {
        console.log(chalk.red("Usage: memphis vault add <key> <value> --password <pass>"));
        return;
      }

      const encrypted = encrypt(opts.value, opts.password);
      const iv = encrypted.substring(0, 24); // IV is in the encrypted data
      
      store.addBlock(chain, {
        type: "vault",
        content: opts.key,
        tags: ["secret", opts.key],
        encrypted,
        iv,
        key_id: opts.key,
      });

      console.log(chalk.green(`✓ Added secret: ${opts.key}`));
      break;
    }

    case "list": {
      const blocks = store.readChain(chain).filter(b => b.data.type === "vault" && b.data.encrypted);
      
      if (blocks.length === 0) {
        console.log(chalk.yellow("No secrets found. Run 'memphis vault init' first."));
        return;
      }

      console.log(chalk.bold("\n🔐 Stored Secrets:\n"));
      blocks.forEach(block => {
        console.log(chalk.cyan(`  • ${block.data.content}`));
      });
      console.log("");
      break;
    }

    case "get": {
      if (!opts.key || !opts.password) {
        console.log(chalk.red("Usage: memphis vault get <key> --password <pass>"));
        return;
      }

      const blocks = store.readChain(chain)
        .filter(b => b.data.type === "vault" && b.data.content === opts.key && b.data.encrypted);

      if (blocks.length === 0) {
        console.log(chalk.red(`Secret '${opts.key}' not found!`));
        return;
      }

      try {
        const secret = decrypt(blocks[0].data.encrypted!, opts.password);
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

      console.log(chalk.yellow("⚠ Deleting secrets is not implemented yet (append-only chain)."));
      console.log(chalk.gray("In future: mark as revoked in next vault block."));
      break;
    }

    default:
      console.log(chalk.red("Unknown action. Use: init, add, list, get, delete"));
  }
}
