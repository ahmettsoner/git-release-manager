import { execSync } from 'child_process';
import { join } from 'path';
import fs from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';
import { cleanupTestProject, createTestProject } from '../projectSetup';

describe('E2E: Branch delete operations', () => {
  const E2E_DIR = join(__dirname, '../../../temp/test/e2e/branch/delete');
  const PROJECT_DIR = join(E2E_DIR, 'test-project');
  const REMOTE_DIR = join(E2E_DIR, 'remote-repo'); // Remote repo path
  let git: SimpleGit;

  beforeAll(async () => {
    await createTestProject(PROJECT_DIR, {
      withGit: true
    });

    // Remote setup
    await fs.promises.mkdir(REMOTE_DIR, { recursive: true });
    simpleGit().cwd(REMOTE_DIR).init(true, ['--bare']);
    
    git = simpleGit(PROJECT_DIR);
    await git.addRemote('origin', REMOTE_DIR);
  });

  afterAll(async () => {
    await cleanupTestProject(E2E_DIR);
  });

  test('Delete a local branch', async () => {
    const branchToDelete = 'local-branch';

    await git.checkoutLocalBranch(branchToDelete);

    let branches = await git.branchLocal();
    expect(branches.all).toContain(branchToDelete);

    // Switch to another branch for deletion process
    await git.checkoutLocalBranch('temp-for-local-deletion');

    // Delete the branch locally
    execSync(`grm branch delete ${branchToDelete}`, { cwd: PROJECT_DIR });

    branches = await git.branchLocal();
    expect(branches.all).not.toContain(branchToDelete);
  });

  test('Delete a remote branch', async () => {
    const branchToDelete = 'remote-branch';

    await git.checkoutLocalBranch(branchToDelete);
    await git.push(['-u', 'origin', branchToDelete]);

    // Check that the branch exists locally and remotely
    let branches = await git.branchLocal();
    expect(branches.all).toContain(branchToDelete);

    const remoteBranchesBefore = await git.branch(['-r']);
    expect(remoteBranchesBefore.all).toContain(`origin/${branchToDelete}`);

    // Switch to another branch for deletion process
    await git.checkoutLocalBranch('temp-for-remote-deletion');

    // Delete the branch locally and push the deletion to the remote
    execSync(`grm branch delete ${branchToDelete} --push`, { cwd: PROJECT_DIR });

    // Check that the branch is deleted locally
    branches = await git.branchLocal();
    expect(branches.all).not.toContain(branchToDelete);

    // Check that the branch is deleted remotely
    const remoteBranchesAfter = await git.branch(['-r']);
    expect(remoteBranchesAfter.all).not.toContain(`origin/${branchToDelete}`);
  });
});