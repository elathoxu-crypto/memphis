#!/usr/bin/env node
/**
 * Encrypted Share Sync Wrapper
 * Provides encrypted multi-agent knowledge exchange
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { agentEncryption } from '../dist/utils/encryption.js';

const MEMPHIS_CLI = 'node /home/memphis/memphis/dist/cli/index.js';

interface SyncResult {
  pushed: number;
  pulled: number;
  encrypted: number;
  decrypted: number;
}

async function encryptedSync(options: { push?: boolean; pull?: boolean; limit?: number }): Promise<SyncResult> {
  const result: SyncResult = {
    pushed: 0,
    pulled: 0,
    encrypted: 0,
    decrypted: 0
  };

  // Load encryption key
  if (!agentEncryption.loadKey()) {
    console.error('❌ No encryption key found. Set AGENT_EXCHANGE_KEY or add to config.yaml');
    return result;
  }

  console.log('🔐 Encrypted sync enabled\n');

  // PUSH: Export, encrypt, upload
  if (options.push) {
    console.log('📤 Exporting blocks for sharing...');

    // Get share-tagged blocks
    const exportCmd = `${MEMPHIS_CLI} show share --limit ${options.limit || 10} --json`;
    const blocks = JSON.parse(execSync(exportCmd, { encoding: 'utf-8' }));

    console.log(`   Found ${blocks.length} blocks to share`);

    // Encrypt each block
    for (const block of blocks) {
      const encrypted = agentEncryption.encryptBlock(block);
      if (encrypted) {
        // Save encrypted block
        const encryptedPath = `/tmp/encrypted-block-${block.index}.json`;
        fs.writeFileSync(encryptedPath, encrypted);

        // Upload to IPFS
        const uploadCmd = `${MEMPHIS_CLI} ipfs upload ${encryptedPath}`;
        const cid = execSync(uploadCmd, { encoding: 'utf-8' }).trim();

        console.log(`   ✓ Encrypted & uploaded: ${block.chain}#${block.index} → ${cid}`);
        result.encrypted++;
        result.pushed++;
      }
    }
  }

  // PULL: Download, decrypt, import
  if (options.pull) {
    console.log('\n📥 Pulling encrypted blocks from network...');

    // Get network CIDs
    const networkCmd = `${MEMPHIS_CLI} show network --json`;
    const entries = JSON.parse(execSync(networkCmd, { encoding: 'utf-8' }));

    for (const entry of entries) {
      try {
        // Download from IPFS
        const downloadCmd = `${MEMPHIS_CLI} ipfs download ${entry.cid}`;
        const encryptedData = execSync(downloadCmd, { encoding: 'utf-8' });

        // Decrypt
        const decrypted = agentEncryption.decryptBlock(encryptedData);
        if (decrypted) {
          // Import to chain
          const importCmd = `echo '${JSON.stringify(decrypted)}' | ${MEMPHIS_CLI} import ${decrypted.chain}`;
          execSync(importCmd, { encoding: 'utf-8' });

          console.log(`   ✓ Decrypted & imported: ${decrypted.chain}#${decrypted.index}`);
          result.decrypted++;
          result.pulled++;
        }
      } catch (error) {
        // Not encrypted or decryption failed, skip
        continue;
      }
    }
  }

  return result;
}

// CLI
const args = process.argv.slice(2);
const options = {
  push: args.includes('--push'),
  pull: args.includes('--pull'),
  limit: parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '10')
};

encryptedSync(options).then(result => {
  console.log('\n📊 Encrypted Sync Summary:');
  console.log(`   Encrypted: ${result.encrypted} blocks`);
  console.log(`   Decrypted: ${result.decrypted} blocks`);
  console.log(`   Pushed: ${result.pushed} blocks`);
  console.log(`   Pulled: ${result.pulled} blocks`);
});
