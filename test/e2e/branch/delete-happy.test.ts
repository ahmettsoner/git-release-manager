import { execSync } from 'child_process';
import { join } from 'path';
import fs from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';
import { createTestProject } from '../projectSetup';

describe('E2E: Branch delete operations', () => {
  const E2E_DIR = join(__dirname, '../../../temp/test/e2e/branch/delete');
  const PROJECT_DIR = join(E2E_DIR, 'test-project');
  let git: SimpleGit;

  beforeAll(async () => {
    await createTestProject(PROJECT_DIR, {
      withGit: true,
      withNpm: false,
      withGitHub: false,
    });
    git = simpleGit(PROJECT_DIR);

    await git.checkoutLocalBranch('temporary-branch');
  });

  afterAll(() => {
    fs.rmSync(E2E_DIR, { recursive: true, force: true });
  });

  test('Delete an existing branch', async () => {
    const branchToDelete = 'temporary-branch';

    let branches = await git.branchLocal();
    expect(branches.all).toContain(branchToDelete);

    // Create and switch to a new temporary branch before deletion
    await git.checkoutLocalBranch('temp-for-deletion');

    execSync(`grm branch --delete ${branchToDelete}`, { cwd: PROJECT_DIR });

    branches = await git.branchLocal();
    expect(branches.all).not.toContain(branchToDelete);
  });
});