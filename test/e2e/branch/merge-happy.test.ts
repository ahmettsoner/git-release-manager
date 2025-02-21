import { execSync } from 'child_process';
import { join } from 'path';
import fs from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';
import { createTestProject } from '../projectSetup';

describe('E2E: Branch merge operations', () => {
  const E2E_DIR = join(__dirname, '../../../temp/test/e2e/branch/merge');
  const PROJECT_DIR = join(E2E_DIR, 'test-project');
  let git: SimpleGit;

  beforeAll(async () => {
    await createTestProject(PROJECT_DIR, {
      withGit: true,
      withNpm: false,
      withGitHub: false,
    });
    git = simpleGit(PROJECT_DIR);

    // Prepare branches for merging
    await git.checkoutLocalBranch('main-branch');
    fs.writeFileSync(join(PROJECT_DIR, 'file.txt'), 'Main branch content\n');
    await git.add('.');
    await git.commit('Initial commit on main branch');

    await git.checkoutLocalBranch('feature-branch');
    fs.writeFileSync(join(PROJECT_DIR, 'file.txt'), 'Feature branch content\n');
    await git.add('.');
    await git.commit('Commit on feature branch');

    // Checkout back to main branch
    await git.checkout('main-branch');
  });

  afterAll(() => {
    fs.rmSync(E2E_DIR, { recursive: true, force: true });
  });

  test('Merge a feature branch into main', async () => {
    const branchToMerge = 'feature-branch';

    // Merge feature branch into main using the CLI command
    execSync(`grm branch --merge ${branchToMerge}`, { cwd: PROJECT_DIR });

    // Verify that the feature branch content is present in main branch
    const fileContent = fs.readFileSync(join(PROJECT_DIR, 'file.txt'), 'utf8');
    expect(fileContent).toContain('Feature branch content');
  });
});