import { Command } from 'commander';
import blessed from 'blessed';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

export const tuiCommand = new Command('tui')
  .description('Launch Terminal User Interface dashboard')
  .action(() => {
    // Create screen
    const screen = blessed.screen({
      smartCSR: true,
      title: 'Memphis Chain Dashboard v3.2.0'
    });

    // Header
    blessed.box({
      parent: screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: '{center}🧠 Memphis Chain Dashboard v3.2.0{/center}',
      tags: true,
      border: { type: 'line' },
      style: { border: { fg: 'cyan' }, fg: 'white', bg: 'blue' }
    });

    // Get chain status
    const chains = ['journal', 'decisions', 'ask', 'share', 'decision', 'summary', 'trade', 'vault'];
    const chainData: any[] = [];

    chains.forEach(chain => {
      const chainDir = path.join(process.env.HOME || '', '.memphis', 'chains', chain);
      let blockCount = 0;
      let status = '❌';
      let lastUpdate = 'N/A';

      if (fs.existsSync(chainDir)) {
        const files = fs.readdirSync(chainDir).filter(f => f.endsWith('.json'));
        blockCount = files.length;
        status = '✅';

        if (files.length > 0) {
          const lastFile = files[files.length - 1];
          const stats = fs.statSync(path.join(chainDir, lastFile));
          lastUpdate = stats.mtime.toISOString().split('T')[0];
        }
      }

      chainData.push({ chain, blockCount, status, lastUpdate });
    });

    // Chain boxes (2 rows of 4)
    const positions = [
      [3, 0], [3, 25], [3, 50], [3, 75],
      [11, 0], [11, 25], [11, 50], [11, 75]
    ];

    chainData.forEach((data, i) => {
      const [top, left] = positions[i];
      const color = data.status === '✅' ? 'green' : 'red';

      blessed.box({
        parent: screen,
        top: top,
        left: `${left}%`,
        width: '24%',
        height: 7,
        label: ` ${data.chain} `,
        content: `${data.status} Status: ${data.status === '✅' ? 'OK' : 'BROKEN'}\n📊 Blocks: ${data.blockCount}\n📅 Updated: ${data.lastUpdate}`,
        border: { type: 'line' },
        style: { border: { fg: color } }
      });
    });

    // Quick stats box
    const totalBlocks = chainData.reduce((sum, d) => sum + d.blockCount, 0);
    const healthyChains = chainData.filter(d => d.status === '✅').length;

    blessed.box({
      parent: screen,
      bottom: 3,
      left: 0,
      width: '100%',
      height: 5,
      label: ' Summary ',
      content: `Total Blocks: ${totalBlocks} | Healthy Chains: ${healthyChains}/8 | Status: ${healthyChains === 8 ? '✅ ALL OK' : '⚠️  ISSUES DETECTED'}`,
      border: { type: 'line' },
      style: { border: { fg: 'cyan' } }
    });

    // Footer
    blessed.box({
      parent: screen,
      bottom: 0,
      left: 0,
      width: '100%',
      height: 3,
      content: '{center}[R] Refresh  [V] Verify  [S] Status  [Q] Quit{/center}',
      tags: true,
      border: { type: 'line' },
      style: { border: { fg: 'cyan' } }
    });

    // Key bindings
    screen.key(['q', 'Q', 'escape'], () => process.exit(0));

    screen.key(['r', 'R'], () => {
      execSync('node ~/memphis/dist/cli/index.js journal "Dashboard refreshed" -t "tui,refresh"', { stdio: 'ignore' });
      screen.destroy();
      execSync('node ~/memphis/dist/cli/index.js tui', { stdio: 'inherit' });
    });

    screen.key(['v', 'V'], () => {
      const verify = execSync('node ~/memphis/dist/cli/index.js verify 2>&1', { encoding: 'utf8' });
      console.log('\n' + verify);
    });

    screen.key(['s', 'S'], () => {
      const status = execSync('node ~/memphis/dist/cli/index.js status 2>&1', { encoding: 'utf8' });
      console.log('\n' + status);
    });

    screen.render();
  });
