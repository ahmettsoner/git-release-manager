import { execSync } from 'child_process';
import { join } from 'path';
import fs from 'fs';
import { cleanupTestProject, createEmptyTestWorkspace } from '../projectSetup';

describe('E2E: Version update command', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/version/update');


    const setupTest = async(project_dir:string, filePath:string, content:string) => {
        await createEmptyTestWorkspace(project_dir, {
            withGit: true,
            withNpm: true,
            withGitHub: true
        });

        fs.writeFileSync(filePath, content);
    }
    

    const PROJECT_DATA = [
        {
            name: "nodejs",
            file: 'package.json',
            initialVersion: '1.2.3',
            updatedVersion: '2.0.0',
            content: `{ "version": "1.2.3" }`
        },
        {
            name: "dotnet",
            file: 'test.csproj',
            initialVersion: '2.0.0',
            updatedVersion: '3.0.0',
            content: `<Project><Version>2.0.0</Version></Project>`
        },
        {
            name: "python",
            file: 'pyproject.toml',
            initialVersion: '3.1.4',
            updatedVersion: '3.2.0',
            content: `version = "3.1.4"`
        },
        {
            name: "gradle",
            file: 'build.gradle',
            initialVersion: '4.5.6',
            updatedVersion: '4.6.0',
            content: `version = '4.5.6'`
        }
    ];

    
    test.each(PROJECT_DATA)('Update version in %s file with specified version', async ({ name, file, initialVersion, updatedVersion, content }) => {
        const PROJECT_DIR = join(E2E_DIR, `test-project-${name}`);
        const filePath = join(PROJECT_DIR, file);
        await setupTest(PROJECT_DIR, filePath, content)

        execSync(`grm version --init ${updatedVersion}`, { cwd: PROJECT_DIR });

        // Update version with specified value, without using --project-path
        execSync(`grm version --update ${updatedVersion}`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        });

        // Read the updated content and verify the version
        const updatedContent = fs.readFileSync(filePath, 'utf8');
        expect(updatedContent).toContain(updatedVersion);

        // Clean up the project directory after the test
        await cleanupTestProject(PROJECT_DIR)
    });

    test.each(PROJECT_DATA)('Update version in specified %s file with specified version', async ({ name, file, initialVersion, updatedVersion, content }) => {
        const PROJECT_DIR = join(E2E_DIR, `test-project-${name}`);
        const filePath = join(PROJECT_DIR, file);
        await setupTest(PROJECT_DIR, filePath, content)

        execSync(`grm version --init ${updatedVersion}`, { cwd: PROJECT_DIR });

        // Use --project-path to update version with specified value
        execSync(`grm version --update ${updatedVersion} --project-path ${filePath}`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        });

        // Read the updated content and verify the version
        const updatedContent = fs.readFileSync(filePath, 'utf8');
        expect(updatedContent).toContain(updatedVersion);

        // Clean up the project directory after the test
        await cleanupTestProject(PROJECT_DIR)
    });

    test.each(PROJECT_DATA)('Update version in %s file using latest git tag', async ({ name, file, initialVersion, updatedVersion, content }) => {
        const PROJECT_DIR = join(E2E_DIR, `test-project-${name}`);

        const filePath = join(PROJECT_DIR, file);
        await setupTest(PROJECT_DIR, filePath, content)

        const versionOutput = execSync(`grm version --init ${updatedVersion}`, { 
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })

        // Update version with specified value, without using --project-path
        const updateOutput = execSync(`grm version --update`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        });

        // Read the updated content and verify the version
        const updatedContent = fs.readFileSync(filePath, 'utf8');
        expect(updatedContent).toContain(updatedVersion);

        // Clean up the project directory after the test
        await cleanupTestProject(PROJECT_DIR)
    });

    test.each(PROJECT_DATA)('Update version in specified %s file without specifying version', async ({ name, file, initialVersion, updatedVersion, content }) => {
        const PROJECT_DIR = join(E2E_DIR, `test-project-${name}`);
        const filePath = join(PROJECT_DIR, file);
        await setupTest(PROJECT_DIR, filePath, content)

        execSync(`grm version --init ${updatedVersion}`, { cwd: PROJECT_DIR });

        // Use --project-path to update version with specified value
        execSync(`grm version --update --project-path ${filePath}`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        });

        // Read the updated content and verify the version
        const updatedContent = fs.readFileSync(filePath, 'utf8');
        expect(updatedContent).toContain(updatedVersion);

        // Clean up the project directory after the test
        await cleanupTestProject(PROJECT_DIR)
    });
});