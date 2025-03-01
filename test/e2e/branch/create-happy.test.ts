import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from '../projectSetup'


describe('E2E: Branch create operations', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/branch/create');
    const PROJECT_DIR = join(E2E_DIR, 'test-project');
    const REMOTE_DIR = join(E2E_DIR, 'remote-repo'); // Remote repo path
    let git: SimpleGit;

    beforeAll(async () => {
        await createTestProject(PROJECT_DIR, { withGit: true });
        await fs.promises.mkdir(REMOTE_DIR, { recursive: true });
        simpleGit().cwd(REMOTE_DIR).init(true);
        git = simpleGit(PROJECT_DIR);
        await git.addRemote('origin', REMOTE_DIR); // Link local git to mock remote
    });

    afterAll(async () => {
        await cleanupTestProject(E2E_DIR)
    })

    test('Create a new branch', async () => {
        // Create a new branch using the CLI command
        const branchName = 'new-feature-branch'
        execSync(`grm branch create ${branchName}`, { cwd: PROJECT_DIR })

        // Fetch the list of branches to verify the new branch was created
        const branches = await git.branchLocal()

        // Verify that the new branch was created
        expect(branches.all).toContain(branchName)
    })

    test('Create a new branch and push to remote', async () => {
        const branchName = 'new-feature-branch-push';
        execSync(`grm branch create ${branchName} --push`, { cwd: PROJECT_DIR });

        // Local repository check
        const localBranches = await git.branchLocal();
        expect(localBranches.all).toContain(branchName);

        // Remote repository check
        const remoteBranches = await git.branch(['-r']);
        expect(remoteBranches.all).toContain(`origin/${branchName}`);
    });
})
