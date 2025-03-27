import { execSync } from 'child_process';
import { join } from 'path';
import simpleGit, { SimpleGit } from 'simple-git';
import { cleanupTestProject, createTestProject } from '../projectSetup';

describe('E2E: Branch rebase error handling', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/branch/rebase');
    const PROJECT_DIR = join(E2E_DIR, 'test-project-error');
    let git: SimpleGit;

    beforeAll(async () => {
        await createTestProject(PROJECT_DIR, { withGit: true });
        git = simpleGit(PROJECT_DIR);
        await git.checkoutLocalBranch('main'); // Ensure we have a branch to test against
    });

    afterAll(async () => {
        await cleanupTestProject(E2E_DIR);
    });

    test('Error when branch name is not provided for rebase', () => {
        try {
            // Attempt to rebase a branch without specifying a name
            execSync(`grm branch rebase`, {
                cwd: PROJECT_DIR,
                stdio: 'pipe', // captures output to read stderr
            });
            fail('Command should have failed due to missing branch name');
        } catch (error: any) {
            // Extract error message from stderr
            const errorMessage = error.stderr.toString();
            expect(errorMessage).toContain("error: missing required argument 'name'");
        }

        // Ensure no branches are rebased erroneously and main branch remains unchanged
        // Assuming the main branch is initialized and we haven't made any changes,
        // we might want to verify the commit history or any expected branch state.
        return git.branchLocal().then(branches => {
            // No additional branches or commits should have been rebased
            expect(branches.all).toContain('main'); // Adjust as necessary
        });
    });
});