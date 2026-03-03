import { GitContext, GitCommit } from './git-context.js';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

export class DecisionInference {
  private gitContext: GitContext;
  private chainsDir: string;

  constructor(repoPath: string = process.cwd()) {
    this.gitContext = new GitContext(repoPath);
    this.chainsDir = path.join(process.env.HOME || '', '.memphis', 'chains');
  }

  async inferFromGit(sinceDays: number = 7): Promise<number> {
    if (!this.gitContext.isGitRepo()) {
      return 0;
    }

    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    const commits = this.gitContext.getRecentCommits(100);
    const recentCommits = commits.filter((c: GitCommit) => c.timestamp >= since);

    let inferred = 0;
    for (const commit of recentCommits) {
      const decision = this.gitContext.extractDecision(commit);
      if (!this.checkDecisionExists(decision.decisionId)) {
        await this.recordInferredDecision(decision);
        inferred++;
      }
    }

    return inferred;
  }

  checkDecisionExists(decisionId: string): boolean {
    const decisionsDir = path.join(this.chainsDir, 'decisions');
    if (!fs.existsSync(decisionsDir)) return false;

    const files = fs.readdirSync(decisionsDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const block = JSON.parse(fs.readFileSync(path.join(decisionsDir, file), 'utf8'));
        if (block.data && block.data.includes(decisionId)) return true;
      } catch (error) {
        // Skip errors
      }
    }
    return false;
  }

  async recordInferredDecision(decision: any): Promise<void> {
    try {
      const title = decision.title.replace(/"/g, '\\"').substring(0, 100);
      const chosen = decision.chosen;
      const reasoning = decision.reasoning.replace(/"/g, '\\"').substring(0, 200);
      execSync(`node ~/memphis/dist/cli/index.js decide "${title}" "${chosen}" -r "${reasoning}" -t "inferred,git,model-b"`, { stdio: 'ignore' });
    } catch (error) {
      // Skip errors
    }
  }

  displayStats(sinceDays: number = 7): void {
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    const stats = this.gitContext.getCommitStats(since);

    console.log(`\n📊 Git Statistics (last ${sinceDays} days):`);
    console.log(`   Total commits: ${stats.total}\n`);

    console.log('   By Type:');
    const types = Object.entries(stats.byType) as [string, number][];
    types.sort((a, b) => b[1] - a[1]);
    types.forEach(([type, count]) => {
      const pct = ((count / stats.total) * 100).toFixed(1);
      console.log(`     ${type}: ${count} (${pct}%)`);
    });

    console.log('\n   By Author:');
    const authors = Object.entries(stats.byAuthor) as [string, number][];
    authors.sort((a, b) => b[1] - a[1]);
    authors.forEach(([author, count]) => {
      console.log(`     ${author}: ${count}`);
    });
  }
}
