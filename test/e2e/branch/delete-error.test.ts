import { execSync } from 'child_process';
import { join } from 'path';
import fs from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';
import { cleanupTestProject, createTestProject } from '../projectSetup';

describe('E2E: Branch delete error handling', () => {
  const E2E_DIR = join(__dirname, '../../../temp/test/e2e/branch/delete');
  const PROJECT_DIR = join(E2E_DIR, 'test-project-error');
  let git: SimpleGit;

  beforeAll(async () => {
    await createTestProject(PROJECT_DIR, { withGit: true });
    git = simpleGit(PROJECT_DIR);
  });

  afterAll(async () => {
    await cleanupTestProject(E2E_DIR);
  });

  test('Error when branch name is not provided for delete', () => {
    try {
      // Attempt to delete a branch without specifying a name
      execSync(`grm branch delete`, {
        cwd: PROJECT_DIR,
        stdio: 'pipe', // captures the output to read stderr
      });
      fail('Command should have failed due to missing branch name');
    } catch (error: any) {
      // Extract error message from stderr
      const errorMessage = error.stderr.toString();
      expect(errorMessage).toContain("error: missing required argument 'name'");
    }

    // Ensure no branches are deleted
    return git.branchLocal().then((branches) => {
      // Assuming we start with only the default branch, ensure it still exists
      expect(branches.all.length).toBe(1); // Adjust if more branches are initially expected
    });
  });
});