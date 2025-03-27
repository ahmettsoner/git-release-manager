import { execSync } from 'child_process';
import { join } from 'path';
import fs from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';
import { cleanupTestProject, createTestProject } from '../projectSetup';

describe('E2E: Branch rebase operations', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/branch/rebase');
    const PROJECT_DIR = join(E2E_DIR, 'test-project');
    const REMOTE_DIR = join(E2E_DIR, 'remote-repo');
    let git: SimpleGit;
    const baseBranch = 'main';

    beforeEach(async () => {
        await cleanupTestProject(E2E_DIR);
        await createTestProject(PROJECT_DIR, { withGit: true });

        // Remote setup
        await fs.promises.mkdir(REMOTE_DIR, { recursive: true });
        simpleGit().cwd(REMOTE_DIR).init(true, ['--bare']);

        git = simpleGit(PROJECT_DIR);
        await git.addRemote('origin', REMOTE_DIR);

        // Initialize with a commit on main
        await git.checkoutLocalBranch('main');
        fs.writeFileSync(join(PROJECT_DIR, 'file.txt'), 'Initial content');
        await git.add('.');
        await git.commit('Initial commit on main');
        await git.push(['-u', 'origin', 'main']);
    });

    afterAll(async () => {
        await cleanupTestProject(E2E_DIR);
    });

    test('Rebase a local branch onto the current branch', async () => {
        const branchToRebase = 'feature-branch';

        // Create and checkout a new branch, add commit
        await git.checkoutLocalBranch(branchToRebase);
        fs.writeFileSync(join(PROJECT_DIR, 'feature.txt'), 'Feature branch content');
        await git.add('.');
        await git.commit('Commit on feature branch');

        // Switch back to main and make another commit
        await git.checkout(baseBranch);
        fs.writeFileSync(join(PROJECT_DIR, 'file.txt'), 'Updated Content on Main');
        await git.add('.');
        await git.commit('Update commit on main');

        // Rebase feature branch onto main
        execSync(`grm branch rebase ${branchToRebase}`, { cwd: PROJECT_DIR });

        // Verify the rebase
        const log = await git.log();
        expect(log.all[0]?.message).toBe('Update commit on main');
        expect(log.all[1]?.message).toBe('Commit on feature branch');

    });
});