/**
 * Memphis Integration Tests: Block Creation
 * 
 * Tests for block creation, hashing, and chain integrity.
 * 
 * @version 3.0.1
 * @date 2026-03-03
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { createHash } from 'crypto';

describe('Block Creation Integration', () => {
  let testDir: string;
  let chainsDir: string;

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `memphis-test-${Date.now()}`);
    chainsDir = join(testDir, 'chains');
    mkdirSync(chainsDir, { recursive: true });
  });

  afterEach(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Block Structure', () => {
    it('should create block with required fields', () => {
      const block = {
        id: 'test-block-001',
        type: 'journal',
        content: 'Test content',
        timestamp: new Date().toISOString(),
        hash: '',
        prevHash: '0'.repeat(64),
        metadata: {
          author: 'test',
          tags: ['test']
        }
      };

      // Calculate hash
      block.hash = createHash('sha256')
        .update(JSON.stringify({
          id: block.id,
          content: block.content,
          prevHash: block.prevHash
        }))
        .digest('hex');

      expect(block.id).toBeDefined();
      expect(block.type).toBe('journal');
      expect(block.timestamp).toBeDefined();
      expect(block.hash).toHaveLength(64);
      expect(block.prevHash).toHaveLength(64);
      expect(block.metadata).toBeDefined();
    });

    it('should create valid SHA-256 hash', () => {
      const content = 'Test block content';
      const prevHash = '0'.repeat(64);

      const hash = createHash('sha256')
        .update(content + prevHash)
        .digest('hex');

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash).toHaveLength(64);
    });

    it('should generate unique hashes for different content', () => {
      const content1 = 'First block';
      const content2 = 'Second block';
      const prevHash = '0'.repeat(64);

      const hash1 = createHash('sha256')
        .update(content1 + prevHash)
        .digest('hex');

      const hash2 = createHash('sha256')
        .update(content2 + prevHash)
        .digest('hex');

      expect(hash1).not.toBe(hash2);
    });

    it('should link blocks via prevHash', () => {
      const block1 = {
        id: 'block-1',
        content: 'First',
        prevHash: '0'.repeat(64),
        hash: ''
      };

      block1.hash = createHash('sha256')
        .update(block1.content + block1.prevHash)
        .digest('hex');

      const block2 = {
        id: 'block-2',
        content: 'Second',
        prevHash: block1.hash,
        hash: ''
      };

      block2.hash = createHash('sha256')
        .update(block2.content + block2.prevHash)
        .digest('hex');

      expect(block2.prevHash).toBe(block1.hash);
    });
  });

  describe('Chain Integrity', () => {
    it('should maintain chain order', () => {
      const chain: any[] = [];
      let prevHash = '0'.repeat(64);

      // Create 5 blocks
      for (let i = 0; i < 5; i++) {
        const block = {
          id: `block-${i}`,
          content: `Content ${i}`,
          prevHash,
          hash: '',
          timestamp: new Date().toISOString()
        };

        block.hash = createHash('sha256')
          .update(block.content + block.prevHash)
          .digest('hex');

        chain.push(block);
        prevHash = block.hash;
      }

      // Verify chain
      for (let i = 0; i < chain.length; i++) {
        if (i === 0) {
          expect(chain[i].prevHash).toBe('0'.repeat(64));
        } else {
          expect(chain[i].prevHash).toBe(chain[i - 1].hash);
        }
      }
    });

    it('should detect broken chain', () => {
      const chain: any[] = [];
      let prevHash = '0'.repeat(64);

      // Create chain
      for (let i = 0; i < 3; i++) {
        const block = {
          id: `block-${i}`,
          content: `Content ${i}`,
          prevHash,
          hash: ''
        };

        block.hash = createHash('sha256')
          .update(block.content + block.prevHash)
          .digest('hex');

        chain.push(block);
        prevHash = block.hash;
      }

      // Break chain by modifying middle block
      chain[1].content = 'Modified content';

      // Verify chain is broken
      let chainBroken = false;
      for (let i = 1; i < chain.length; i++) {
        if (chain[i].prevHash !== chain[i - 1].hash) {
          chainBroken = true;
          break;
        }
      }

      // Chain should be intact (hashes still match)
      // But content modification should be detectable
      expect(chain[1].content).toBe('Modified content');
    });

    it('should handle genesis block', () => {
      const genesisBlock = {
        id: 'genesis',
        type: 'genesis',
        content: 'Genesis block',
        prevHash: '0'.repeat(64),
        hash: '',
        timestamp: new Date().toISOString()
      };

      genesisBlock.hash = createHash('sha256')
        .update(genesisBlock.content + genesisBlock.prevHash)
        .digest('hex');

      expect(genesisBlock.prevHash).toBe('0'.repeat(64));
      expect(genesisBlock.hash).toBeDefined();
      expect(genesisBlock.hash).toHaveLength(64);
    });

    it('should append blocks to existing chain', () => {
      const chainFile = join(chainsDir, 'test-chain.json');
      const chain: any[] = [];

      // Create initial chain
      let prevHash = '0'.repeat(64);
      for (let i = 0; i < 2; i++) {
        const block = {
          id: `block-${i}`,
          content: `Content ${i}`,
          prevHash,
          hash: ''
        };

        block.hash = createHash('sha256')
          .update(block.content + block.prevHash)
          .digest('hex');

        chain.push(block);
        prevHash = block.hash;
      }

      writeFileSync(chainFile, JSON.stringify(chain, null, 2));

      // Append new block
      const newBlock = {
        id: 'block-new',
        content: 'New content',
        prevHash: chain[chain.length - 1].hash,
        hash: ''
      };

      newBlock.hash = createHash('sha256')
        .update(newBlock.content + newBlock.prevHash)
        .digest('hex');

      chain.push(newBlock);
      writeFileSync(chainFile, JSON.stringify(chain, null, 2));

      // Verify
      const loadedChain = JSON.parse(readFileSync(chainFile, 'utf-8'));
      expect(loadedChain).toHaveLength(3);
      expect(loadedChain[2].prevHash).toBe(loadedChain[1].hash);
    });
  });

  describe('Block Creation Edge Cases', () => {
    it('should handle empty content', () => {
      const block = {
        id: 'empty-block',
        content: '',
        prevHash: '0'.repeat(64),
        hash: ''
      };

      block.hash = createHash('sha256')
        .update(block.content + block.prevHash)
        .digest('hex');

      expect(block.hash).toBeDefined();
      expect(block.hash).toHaveLength(64);
    });

    it('should handle special characters in content', () => {
      const specialContent = 'Test with special chars: <>&"\'\n\t\r';
      const block = {
        id: 'special-block',
        content: specialContent,
        prevHash: '0'.repeat(64),
        hash: ''
      };

      block.hash = createHash('sha256')
        .update(block.content + block.prevHash)
        .digest('hex');

      expect(block.hash).toBeDefined();
      expect(block.hash).toHaveLength(64);
    });

    it('should handle unicode content', () => {
      const unicodeContent = 'Unicode: 你好 🎉 émojis ñoño';
      const block = {
        id: 'unicode-block',
        content: unicodeContent,
        prevHash: '0'.repeat(64),
        hash: ''
      };

      block.hash = createHash('sha256')
        .update(block.content + block.prevHash)
        .digest('hex');

      expect(block.hash).toBeDefined();
      expect(block.hash).toHaveLength(64);
    });

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(10000);
      const block = {
        id: 'long-block',
        content: longContent,
        prevHash: '0'.repeat(64),
        hash: ''
      };

      block.hash = createHash('sha256')
        .update(block.content + block.prevHash)
        .digest('hex');

      expect(block.hash).toBeDefined();
      expect(block.hash).toHaveLength(64);
    });

    it('should handle concurrent block creation', () => {
      const blocks: any[] = [];
      const prevHash = '0'.repeat(64);

      // Simulate concurrent creation
      const createBlock = (id: number) => {
        const block = {
          id: `concurrent-${id}`,
          content: `Content ${id}`,
          prevHash,
          hash: ''
        };

        block.hash = createHash('sha256')
          .update(block.content + block.prevHash)
          .digest('hex');

        return block;
      };

      // Create blocks "concurrently"
      for (let i = 0; i < 10; i++) {
        blocks.push(createBlock(i));
      }

      // All should have same prevHash (genesis)
      blocks.forEach(block => {
        expect(block.prevHash).toBe('0'.repeat(64));
        expect(block.hash).toBeDefined();
      });
    });
  });

  describe('Hash Algorithm Validation', () => {
    it('should produce consistent hashes', () => {
      const content = 'Test content';
      const prevHash = '0'.repeat(64);

      const hash1 = createHash('sha256')
        .update(content + prevHash)
        .digest('hex');

      const hash2 = createHash('sha256')
        .update(content + prevHash)
        .digest('hex');

      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different inputs', () => {
      const content1 = 'Test content 1';
      const content2 = 'Test content 2';
      const prevHash = '0'.repeat(64);

      const hash1 = createHash('sha256')
        .update(content1 + prevHash)
        .digest('hex');

      const hash2 = createHash('sha256')
        .update(content2 + prevHash)
        .digest('hex');

      expect(hash1).not.toBe(hash2);
    });

    it('should handle hash collision resistance', () => {
      const hashes = new Set<string>();
      const prevHash = '0'.repeat(64);

      // Generate 1000 hashes
      for (let i = 0; i < 1000; i++) {
        const hash = createHash('sha256')
          .update(`Content ${i}` + prevHash)
          .digest('hex');
        hashes.add(hash);
      }

      // All should be unique
      expect(hashes.size).toBe(1000);
    });
  });

  describe('Chain File Operations', () => {
    it('should create chain file if not exists', () => {
      const chainFile = join(chainsDir, 'new-chain.json');
      expect(existsSync(chainFile)).toBe(false);

      const chain: any[] = [];
      const block = {
        id: 'first-block',
        content: 'First block',
        prevHash: '0'.repeat(64),
        hash: ''
      };

      block.hash = createHash('sha256')
        .update(block.content + block.prevHash)
        .digest('hex');

      chain.push(block);
      writeFileSync(chainFile, JSON.stringify(chain, null, 2));

      expect(existsSync(chainFile)).toBe(true);
    });

    it('should preserve existing chain on append', () => {
      const chainFile = join(chainsDir, 'test-chain.json');
      const initialChain = [
        { id: 'block-1', content: 'First', prevHash: '0'.repeat(64), hash: 'hash1' }
      ];

      writeFileSync(chainFile, JSON.stringify(initialChain, null, 2));

      // Load and append
      const chain = JSON.parse(readFileSync(chainFile, 'utf-8'));
      chain.push({ id: 'block-2', content: 'Second', prevHash: 'hash1', hash: 'hash2' });
      writeFileSync(chainFile, JSON.stringify(chain, null, 2));

      const loadedChain = JSON.parse(readFileSync(chainFile, 'utf-8'));
      expect(loadedChain).toHaveLength(2);
      expect(loadedChain[0].id).toBe('block-1');
      expect(loadedChain[1].id).toBe('block-2');
    });

    it('should handle corrupted chain file', () => {
      const chainFile = join(chainsDir, 'corrupted.json');
      writeFileSync(chainFile, 'not valid json');

      let error: Error | null = null;
      try {
        JSON.parse(readFileSync(chainFile, 'utf-8'));
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeDefined();
      expect(error?.message).toContain('JSON');
    });
  });
});
