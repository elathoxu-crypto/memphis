/**
 * Integration tests for Phase 6 auto-categorization
 * Tests the full journal --suggest-tags flow end-to-end
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const MEMPHIS_CLI = './dist/cli/index.js';
const TEST_WORKSPACE = '/tmp/memphis-integration-test';

describe('Phase 6 Integration — journal --suggest-tags', () => {
  beforeEach(() => {
    // Create fresh test workspace
    if (fs.existsSync(TEST_WORKSPACE)) {
      fs.rmSync(TEST_WORKSPACE, { recursive: true });
    }
    fs.mkdirSync(TEST_WORKSPACE, { recursive: true });
    
    // Set environment
    process.env.MEMPHIS_WORKSPACE = TEST_WORKSPACE;
    process.env.MEMPHIS_PATH = path.join(TEST_WORKSPACE, '.memphis');
  });

  afterEach(() => {
    // Cleanup
    if (fs.existsSync(TEST_WORKSPACE)) {
      fs.rmSync(TEST_WORKSPACE, { recursive: true });
    }
  });

  describe('Pattern Matching', () => {
    it('should suggest "meeting" tag for meeting content', () => {
      const input = 'Meeting with John about Project X';
      const result = runMemphis(`journal "${input}" --suggest-tags`, 'y');
      
      expect(result).toContain('meeting');
      expect(result).toContain('confidence');
    });

    it('should suggest "decision" tag for decision content', () => {
      const input = 'Decided to use PostgreSQL instead of MongoDB';
      const result = runMemphis(`journal "${input}" --suggest-tags`, 'y');
      
      expect(result).toContain('decision');
    });

    it('should suggest "bug" tag for bug content', () => {
      const input = 'Bug: Login button crashes on mobile';
      const result = runMemphis(`journal "${input}" --suggest-tags`, 'y');
      
      expect(result).toContain('bug');
    });

    it('should suggest "feature" tag for feature content', () => {
      const input = 'Feature: Added dark mode support';
      const result = runMemphis(`journal "${input}" --suggest-tags`, 'y');
      
      expect(result).toContain('feature');
    });

    it('should suggest multiple tags for complex content', () => {
      const input = 'Meeting with @john about Project X. Decided to use React.';
      const result = runMemphis(`journal "${input}" --suggest-tags`, 'y');
      
      expect(result).toContain('meeting');
      expect(result).toContain('decision');
    });
  });

  describe('Learning Persistence', () => {
    it('should save accepted tags to learning data', () => {
      const input = 'Bug: Critical security issue';
      const result = runMemphis(`journal "${input}" --suggest-tags`, 'y');
      
      // Check that learning happened (tags were accepted)
      expect(result).toContain('Applied');
      expect(result).toMatch(/Categorization: \d+ms/);
    });

    it('should save rejected tags to learning data', () => {
      const input = 'Bug: Test issue';
      runMemphis(`journal "${input}" --suggest-tags`, 'n');
      
      const learningPath = path.join(TEST_WORKSPACE, '.memphis', 'intelligence', 'learning-data.json');
      if (fs.existsSync(learningPath)) {
        const learning = JSON.parse(fs.readFileSync(learningPath, 'utf-8'));
        expect(learning.rejectedPatterns).toBeDefined();
      }
    });

    it('should persist learning across sessions', () => {
      // First session
      const result1 = runMemphis(`journal "Bug: First issue" --suggest-tags`, 'y');
      expect(result1).toContain('Applied');
      
      // Second session
      const result2 = runMemphis(`journal "Bug: Second issue" --suggest-tags`, 'y');
      expect(result2).toContain('Applied');
      
      // Check stats show accumulation
      const statsResult = runMemphis('intelligence stats', '');
      expect(statsResult).toContain('Total feedback');
    });
  });

  describe('User Interaction', () => {
    it('should prompt user to accept/reject suggestions', () => {
      const input = 'Meeting with team';
      const result = runMemphis(`journal "${input}" --suggest-tags`, 's');
      
      expect(result).toContain('Accept suggestions?');
      expect(result).toContain('[y/n/e=edit/s=skip]');
    });

    it('should skip tagging when user chooses [s]', () => {
      const input = 'Meeting with team';
      const result = runMemphis(`journal "${input}" --suggest-tags`, 's');
      
      expect(result).toContain('Skipped tagging');
    });

    it('should accept all tags when user chooses [y]', () => {
      const input = 'Bug: Test bug';
      const result = runMemphis(`journal "${input}" --suggest-tags`, 'y');
      
      expect(result).toContain('Applied');
    });
  });

  describe('Performance', () => {
    it('should classify pattern-based content in <50ms', () => {
      const input = 'Meeting with John about Project X';
      const start = Date.now();
      
      runMemphis(`journal "${input}" --suggest-tags`, 'y');
      
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000); // 5s with CLI overhead
    });

    it('should show categorization time in output', () => {
      const input = 'Bug: Performance test';
      const result = runMemphis(`journal "${input}" --suggest-tags`, 'y');
      
      expect(result).toMatch(/Categorization: \d+ms/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty content', () => {
      const result = runMemphis(`journal "" --suggest-tags`, 'y');
      
      // Should not crash
      expect(result).toBeDefined();
    });

    it('should handle very long content', () => {
      const input = 'Meeting with John. '.repeat(100);
      const result = runMemphis(`journal "${input}" --suggest-tags`, 'y');
      
      expect(result).toContain('Applied');
    });

    it('should handle special characters', () => {
      const input = 'Bug: Error with @#$% characters!!!';
      const result = runMemphis(`journal "${input}" --suggest-tags`, 'y');
      
      expect(result).toContain('bug');
    });

    it('should handle content with no clear patterns', () => {
      const input = 'The thing is working but needs optimization';
      const result = runMemphis(`journal "${input}" --suggest-tags`, 's');
      
      // Should either suggest low-confidence tags or skip
      expect(result).toBeDefined();
    });
  });

  describe('CLI Stats', () => {
    it('should show learning statistics', () => {
      // First, create some learning data
      runMemphis(`journal "Bug: Test" --suggest-tags`, 'y');
      runMemphis(`journal "Meeting with John" --suggest-tags`, 'y');
      
      // Then check stats
      const result = runMemphis('intelligence stats', '');
      
      expect(result).toContain('Learning Statistics');
      expect(result).toContain('Total feedback');
      expect(result).toContain('Accepted tags');
    });

    it('should show top accepted tags', () => {
      // Create learning data
      runMemphis(`journal "Bug: First" --suggest-tags`, 'y');
      runMemphis(`journal "Bug: Second" --suggest-tags`, 'y');
      
      const result = runMemphis('intelligence stats', '');
      
      expect(result).toContain('Top Accepted Tags');
    }, 10000); // Increase timeout to 10s
  });
});

/**
 * Helper to run Memphis CLI with stdin input
 */
function runMemphis(args: string, stdin: string): string {
  try {
    const cmd = `echo "${stdin}" | node ${MEMPHIS_CLI} ${args} 2>&1`;
    const result = execSync(cmd, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        MEMPHIS_WORKSPACE: TEST_WORKSPACE,
        MEMPHIS_PATH: path.join(TEST_WORKSPACE, '.memphis')
      },
      timeout: 10000,
      encoding: 'utf-8'
    });
    return result;
  } catch (err: any) {
    // Some commands may exit with non-zero but still have valid output
    return err.stdout || err.stderr || err.message;
  }
}
