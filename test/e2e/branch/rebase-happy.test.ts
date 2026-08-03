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
        await cleanupTestProject(PROJECT_DIR);
        await createTestProject(PROJECT_DIR, { withGit: true });

        // Remote setup.
        //
        // The bare remote is state too, and it has to be cleaned wherever the
        // project is. Left in place it still carries the PREVIOUS run's `main`,
        // while the project directory above was just recreated from scratch —
        // so the push below offers an unrelated history and git refuses it as
        // non-fast-forward. Measured: this test failed identically on two
        // consecutive runs with `[rejected] (fetch first)`, which reads like a
        // product defect and is not one.
        //
        // `init --bare` over an existing directory is a no-op, so creating the
        // remote without removing it first silently REUSES the old one.
        await cleanupTestProject(REMOTE_DIR);
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
        await cleanupTestProject(PROJECT_DIR);
        // Leave no remote behind either — see the note in beforeEach.
        await cleanupTestProject(REMOTE_DIR);
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