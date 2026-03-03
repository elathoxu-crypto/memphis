import { Command } from 'commander';
import { GitContext, GitCommit } from '../../cognitive/git-context.js';
import { DecisionInference } from '../../cognitive/decision-inference.js';

const gitContext = new GitContext(process.cwd());
const decisionInference = new DecisionInference(process.cwd());

export const gitCommand = new Command('git')
  .description('Git integration for Model B (inferred decisions)');

gitCommand
  .command('status')
  .description('Check git integration status')
  .action(() => {
    const isRepo = gitContext.isGitRepo();
    console.log(isRepo ? '✅ Git repository detected' : '❌ Not a git repository');

    if (isRepo) {
      const commits = gitContext.getRecentCommits(5);
      console.log(`\n📊 Recent commits (${commits.length}):`);
      commits.forEach((c: GitCommit) => {
        console.log(`  ${c.hash.substring(0, 8)} - ${c.message.substring(0, 50)}`);
      });
    }
  });

gitCommand
  .command('sync')
  .description('Infer decisions from recent commits')
  .option('-d, --days <number>', 'Number of days to look back', '7')
  .action(async (options) => {
    const days = parseInt(options.days);
    console.log(`🔄 Inferring decisions from last ${days} days...\n`);

    const count = await decisionInference.inferFromGit(days);

    console.log(`\n✅ Inferred ${count} new decisions from git commits`);
  });

gitCommand
  .command('stats')
  .description('Display git commit statistics')
  .option('-d, --days <number>', 'Number of days to analyze', '7')
  .action((options) => {
    const days = parseInt(options.days);
    decisionInference.displayStats(days);
  });
