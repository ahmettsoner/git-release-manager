import { execSync } from 'child_process';
import { join } from 'path';
import fs from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';
import { createTestProject } from '../projectSetup';

describe('E2E: Branch finish operations', () => {
  const E2E_DIR = join(__dirname, '../../../temp/test/e2e/branch/finish');
  const PROJECT_DIR = join(E2E_DIR, 'test-project');
  const configPath = join(PROJECT_DIR, 'branchConfig.json');
  let git: SimpleGit;

  beforeAll(async () => {
    await createTestProject(PROJECT_DIR, {
      withGit: true,
      withNpm: false,
      withGitHub: false,
    });
    git = simpleGit(PROJECT_DIR);

    // Initial setup for branches
    await git.checkoutLocalBranch('develop');
    await git.commit('Initial commit on develop', ['--allow-empty']);


    await git.checkoutLocalBranch('main');
    await git.commit('Initial commit on main', ['--allow-empty']);

    // Write branch configuration
    const config = {
      branchStrategies: {
        feature: {
          baseBranches: ['develop'],
          createTag: false,
          deleteAfterMerge: true,
        },
        release: {
          baseBranches: ['main', 'develop'],
          createTag: true,
          deleteAfterMerge: true,
          tagPrefix: 'v',
        },
        hotfix: {
          baseBranches: ['main', 'develop'],
          createTag: true,
          deleteAfterMerge: true,
          tagPrefix: 'hotfix-',
        },
      },
    };

    fs.writeFileSync(configPath, JSON.stringify(config));
    await git.add(configPath);
    await git.commit('Add config for branch operations');
  });

  afterAll(() => {
    fs.rmSync(E2E_DIR, { recursive: true, force: true });
  });

  test('Finish a feature branch', async () => {
    console.log('Starting to finish feature/test-feature');
    
    await git.checkoutLocalBranch('feature/test-feature');
    console.log('Checked out to feature/test-feature');

    fs.writeFileSync(join(PROJECT_DIR, 'feature.txt'), 'Feature branch content\n');
    await git.add('.');
    await git.commit('Add feature');
    console.log('Committed a feature');

    await git.checkout('develop');
    console.log('Checked out to develop branch');

    // Use the CLI command to finish the branch
    execSync(`grm branch --finish feature/test-feature --config ${configPath}`, {
      cwd: PROJECT_DIR,
    });

    // Verify the branch is merged and deleted
    const branches = await git.branchLocal();
    expect(branches.all).not.toContain('feature/test-feature');

    const log = await git.log();
    const merged = log.all.some((entry) => entry.message.includes('Add feature'));
    expect(merged).toBe(true);
    console.log('Feature branch finished successfully');
  });


  test('Finish a release branch with tag creation', async () => {
    await git.checkoutLocalBranch('release/v1.0.0');
    fs.writeFileSync(join(PROJECT_DIR, 'release.txt'), 'Release branch content\n');
    await git.add('.');
    await git.commit('Add release notes');

    await git.checkout('main')
    execSync(`grm branch --finish release/v1.0.0 --config ${configPath}`, { cwd: PROJECT_DIR });

    const branches = await git.branchLocal();
    expect(branches.all).not.toContain('release/v1.0.0');

    const tags = await git.tags();
    expect(tags.all).toContain('v1.0.0');
  });

  test('Finish a release branch with tag creation with auto prefix', async () => {
    await git.checkoutLocalBranch('release/1.0.0');
    fs.writeFileSync(join(PROJECT_DIR, 'release.txt'), 'Release branch content\n');
    await git.add('.');
    await git.commit('Add release notes');

    await git.checkout('main')
    execSync(`grm branch --finish release/1.0.0 --config ${configPath}`, { cwd: PROJECT_DIR });

    const branches = await git.branchLocal();
    expect(branches.all).not.toContain('release/1.0.0');

    const tags = await git.tags();
    expect(tags.all).toContain('v1.0.0');
  });

  test('Finish a hotfix branch with tag creation', async () => {
    await git.checkoutLocalBranch('hotfix/urgent-fix');
    fs.writeFileSync(join(PROJECT_DIR, 'hotfix.txt'), 'Hotfix content\n');
    await git.add('.');
    await git.commit('Fix urgent issue');

    await git.checkout('main');
    execSync(`grm branch --finish hotfix/urgent-fix --config ${configPath}`, { cwd: PROJECT_DIR });

    const branches = await git.branchLocal();
    expect(branches.all).not.toContain('hotfix/urgent-fix');

    const tags = await git.tags();
    expect(tags.all).toContain('hotfix-urgent-fix');
  });
  

  test('Finish the current branch (hotfix)', async () => {
    await git.checkout('develop');
    await git.checkoutLocalBranch('hotfix/current-hotfix');
    fs.writeFileSync(join(PROJECT_DIR, 'hotfix-current.txt'), 'Current hotfix content\n');
    await git.add('.');
    await git.commit('Add current hotfix');

    // Run the command without specifying a branch name
    execSync(`grm branch --finish --config ${configPath}`, { cwd: PROJECT_DIR });

    const branches = await git.branchLocal();
    expect(branches.all).not.toContain('hotfix/current-hotfix');

    const tags = await git.tags();
    expect(tags.all).toContain('hotfix-current-hotfix');
  });
});