import { execSync } from 'child_process';
import { join } from 'path';
import fs from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';
import { cleanupTestProject, createTestProject } from '../projectSetup';

describe('E2E: Branch feature operations', () => {
  const E2E_DIR = join(__dirname, '../../../temp/test/e2e/branch/feature');
  const PROJECT_DIR = join(E2E_DIR, 'test-project');
  let git: SimpleGit;

  beforeAll(async () => {
    await createTestProject(PROJECT_DIR, {
      withGit: true,
      withNpm: false,
      withGitHub: false,
    });
    git = simpleGit(PROJECT_DIR);

    // Assume 'master' exists, so checkout rather than create
    await git.checkout('master');
    fs.writeFileSync(join(PROJECT_DIR, 'index.html'), '<html></html>\n');
    await git.add('.');
    await git.commit('Initial commit on master');
  });

  afterAll(async () => {
    await cleanupTestProject(E2E_DIR);
  })
  
  test('Create and switch to a feature branch', async () => {
    const featureBranch = 'login';
    const fullBranchName = `feature/${featureBranch}`;
    
    // Use the CLI command to create a feature branch
    execSync(`grm branch --feature ${featureBranch}`, { cwd: PROJECT_DIR });
  
    // Verify the feature branch exists
    const branches = await git.branchLocal();
    expect(branches.all).toContain(fullBranchName);
  
    // Verify that we are on the feature branch
    const currentBranch = await git.revparse(['--abbrev-ref', 'HEAD']);
    expect(currentBranch.trim()).toBe(fullBranchName);
  
    // Optionally verify content in feature branch
    const content = fs.readFileSync(join(PROJECT_DIR, 'index.html'), 'utf8');
    expect(content).toContain('<html></html>');
  });
});