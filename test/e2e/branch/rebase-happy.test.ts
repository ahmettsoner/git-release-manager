import { execSync } from 'child_process';
import { join } from 'path';
import fs from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';
import { createTestProject } from '../projectSetup';

describe('E2E: Branch rebase operations', () => {
  const E2E_DIR = join(__dirname, '../../../temp/test/e2e/branch/rebase');
  const PROJECT_DIR = join(E2E_DIR, 'test-project');
  let git: SimpleGit;

  beforeAll(async () => {
    await createTestProject(PROJECT_DIR, {
      withGit: true,
      withNpm: false,
      withGitHub: false,
    });
    git = simpleGit(PROJECT_DIR);

    // Set up 'main' branch
    await git.checkoutLocalBranch('main');
    fs.writeFileSync(join(PROJECT_DIR, 'main.txt'), 'Main branch content\n');
    await git.add('.');
    await git.commit('Add main content');

    // Set up 'feature' branch
    await git.checkoutLocalBranch('feature');
    fs.writeFileSync(join(PROJECT_DIR, 'feature.txt'), 'Feature branch content\n');
    await git.add('.');
    await git.commit('Add feature content');

    // Add more commits to 'main' after the 'feature' branch was created
    await git.checkout('main');
    fs.appendFileSync(join(PROJECT_DIR, 'main.txt'), 'More main branch content\n');
    await git.add('.');
    await git.commit('Update main content');
  });

  afterAll(() => {
    fs.rmSync(E2E_DIR, { recursive: true, force: true });
  });

  test('Rebase a feature branch onto main', async () => {
      // Ensure we're on the feature branch before rebasing
      await git.checkout('feature');

      // Rebase 'feature' onto 'main'
      execSync(`grm branch --rebase main`, {
        cwd: PROJECT_DIR,
      });

      // Check if we're on the feature after rebase - just a check point
      const currentBranch = await git.revparse(['--abbrev-ref', 'HEAD']);
      expect(currentBranch.trim()).toBe('feature');

      // Verify the current branch has all main branch changes
      const log = await git.log();
      const hasUpdatedMainContent = log.all.some((entry) =>
        entry.message.includes('Update main content')
      );
      
      expect(hasUpdatedMainContent).toBe(true);

      // Check if 'feature.txt' exists, ensuring feature branch content remains intact
      const featureFileExists = fs.existsSync(join(PROJECT_DIR, 'feature.txt'));
      expect(featureFileExists).toBe(true);
  });
});