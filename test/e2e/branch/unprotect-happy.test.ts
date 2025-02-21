import { execSync } from 'child_process';
import { join } from 'path';
import fs from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';
import { createTestProject } from '../projectSetup';

describe('E2E: Branch unprotect operations', () => {
  const E2E_DIR = join(__dirname, '../../../temp/test/e2e/branch/unprotect');
  const PROJECT_DIR = join(E2E_DIR, 'test-project');
  let git: SimpleGit;

  beforeAll(async () => {
    await createTestProject(PROJECT_DIR, {
      withGit: true,
      withNpm: false,
      withGitHub: false,
    });
    git = simpleGit(PROJECT_DIR);

    // Set up initial branches
    await git.checkoutLocalBranch('main');
    await git.commit('Initial commit on main', ['--allow-empty']);

    await git.checkoutLocalBranch('develop');
    await git.commit('Initial commit on develop', ['--allow-empty']);
  });

  afterAll(() => {
    fs.rmSync(E2E_DIR, { recursive: true, force: true });
  });

  test('Unprotect a specific branch', async () => {
    const branchToUnprotect = 'develop';
    
    // Initially protect the branch to ensure it can be unprotected
    execSync(`grm branch --protect ${branchToUnprotect}`, {
      cwd: PROJECT_DIR,
    });

    // Use the CLI command to unprotect the branch
    execSync(`grm branch --unprotect ${branchToUnprotect}`, {
      cwd: PROJECT_DIR,
    });

    // Verify the branch is no longer protected
    const config = await git.listConfig();
    const protectedBranches = config.all['branch.protected'] || [];
    const protectedBranchesList = Array.isArray(protectedBranches)
      ? protectedBranches
      : JSON.parse(protectedBranches);

    expect(protectedBranchesList).not.toContain(branchToUnprotect);
  });

  test('Unprotect current branch', async () => {
    const branchToUnprotect = 'develop';
    await git.checkout(branchToUnprotect);

    // Initially protect the branch to ensure it can be unprotected
    execSync(`grm branch --protect`, {
      cwd: PROJECT_DIR,
    });

    // Use the CLI command to unprotect the current branch without specifying it
    execSync(`grm branch --unprotect`, {
      cwd: PROJECT_DIR,
    });

    // Verify the branch is no longer protected
    const config = await git.listConfig();
    const protectedBranches = config.all['branch.protected'] || [];
    const protectedBranchesList = Array.isArray(protectedBranches)
      ? protectedBranches
      : JSON.parse(protectedBranches);

    expect(protectedBranchesList).not.toContain(branchToUnprotect);
  });
});