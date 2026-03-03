import { execSync } from 'child_process';

export interface GitCommit {
  hash: string;
  author: string;
  email: string;
  timestamp: Date;
  message: string;
}

export class GitContext {
  private repoPath: string;

  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath;
  }

  isGitRepo(): boolean {
    try {
      execSync('git rev-parse --git-dir', { cwd: this.repoPath, stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  getRecentCommits(count: number = 10): GitCommit[] {
    if (!this.isGitRepo()) return [];

    try {
      const log = execSync(
        `git log --pretty=format:"%H|%an|%ae|%at|%s" -n ${count}`,
        { cwd: this.repoPath, encoding: 'utf8' }
      ).toString();

      return log.split('\n').filter((line: string) => line.trim()).map((line: string): GitCommit => {
        const [hash, author, email, timestamp, message] = line.split('|');
        return {
          hash: hash || '',
          author: author || '',
          email: email || '',
          timestamp: new Date(parseInt(timestamp || '0') * 1000),
          message: message || ''
        };
      });
    } catch (error) {
      return [];
    }
  }

  extractDecision(commit: GitCommit): any {
    const type = this.detectCommitType(commit.message);
    const category = this.detectCategory(commit.message);

    return {
      schema: 'decision:v1',
      decisionId: `git-${commit.hash.substring(0, 16)}`,
      mode: 'inferred',
      status: 'active',
      scope: 'project',
      title: commit.message,
      chosen: type,
      reasoning: `Inferred from git commit ${commit.hash.substring(0, 8)} by ${commit.author}`,
      confidence: 0.8,
      context: {
        commit: commit.hash,
        author: commit.author,
        category: category
      }
    };
  }

  detectCommitType(message: string): string {
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.match(/^(feat|feature):/)) return 'feature';
    if (lowerMsg.match(/^(fix|bugfix):/)) return 'bugfix';
    if (lowerMsg.match(/^(refactor|ref):/)) return 'refactor';
    if (lowerMsg.match(/^(docs|doc):/)) return 'documentation';
    if (lowerMsg.match(/^(test):/)) return 'testing';
    if (lowerMsg.match(/^(chore):/)) return 'maintenance';
    return 'unknown';
  }

  detectCategory(message: string): string {
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('chain')) return 'blockchain';
    if (lowerMsg.includes('git')) return 'git';
    if (lowerMsg.includes('cognitive')) return 'cognitive';
    if (lowerMsg.includes('test')) return 'testing';
    return 'general';
  }

  getCommitStats(since: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)): any {
    const commits = this.getRecentCommits(100);
    const recentCommits = commits.filter((c: GitCommit) => c.timestamp >= since);

    const stats = {
      total: recentCommits.length,
      byType: {} as Record<string, number>,
      byAuthor: {} as Record<string, number>,
      byCategory: {} as Record<string, number>
    };

    recentCommits.forEach((commit: GitCommit) => {
      const type = this.detectCommitType(commit.message);
      const category = this.detectCategory(commit.message);
      stats.byType[type] = (stats.byType[type] || 0) + 1;
      stats.byAuthor[commit.author] = (stats.byAuthor[commit.author] || 0) + 1;
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    });

    return stats;
  }
}
