import { execSync } from 'child_process';
import { join } from 'path';
import fs from 'fs';
import simpleGit, { SimpleGit } from 'simple-git';
import { cleanupTestProject, createTestProject } from '../projectSetup';

describe('E2E: Branch create error handling', () => {
  const E2E_DIR = join(__dirname, '../../../temp/test/e2e/branch/create');
  const PROJECT_DIR = join(E2E_DIR, 'test-project-error');
  let git: SimpleGit;

  beforeAll(async () => {
    await createTestProject(PROJECT_DIR, { withGit: true });
    git = simpleGit(PROJECT_DIR);
  });

  afterAll(async () => {
    await cleanupTestProject(E2E_DIR);
  });

  test('Error when branch name is not provided', () => {
    try {
      // Attempt to create a new branch without specifying a name
      execSync(`grm branch create`, {
        cwd: PROJECT_DIR,
        stdio: 'pipe', // captures the output to ensure we can read stderr
      });
      fail('Command should have failed due to missing branch name');
    } catch (error: any) {
      // Extract error message from stderr
      const errorMessage = error.stderr.toString();
      expect(errorMessage).toContain("error: missing required argument 'name'");
    }

    // Ensure no new branches were created
    return git.branchLocal().then((branches) => {
      // Assuming we start with only the default branch,
      // No additional branches should be found
      expect(branches.all.length).toBe(1); // Adjust if more branches are initially expected
    });
  });
});