import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import { createEmptyTestWorkspace } from '../projectSetup'

describe('E2E: Version auto-detect command', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/version/auto-detect')


    const setupTest = async(project_dir:string, filePath:string, content:string) => {
        await createEmptyTestWorkspace(project_dir, {
            withGit: true,
            withNpm: true,
            withGitHub: true
        });

        fs.writeFileSync(filePath, content);
    }
    const cleanTest = async (project_dir:string) => {

        fs.rmSync(project_dir, { recursive: true, force: true });
    }

    const PROJECT_DATA = [
        {
            name: "nodejs",
            file: 'package.json',
            version: '1.2.3',
            content: `{ "version": "1.2.3" }`
        },
        {
            name: "dotnet",
            file: 'test.csproj',
            version: '2.0.0',
            content: `<Project><Version>2.0.0</Version></Project>`
        },
        {
            name: "python",
            file: 'pyproject.toml',
            version: '3.1.4',
            content: `version = "3.1.4"`
        },
        {
            name: "gradle",
            file: 'build.gradle',
            version: '4.5.6',
            content: `version = '4.5.6'`
        },
        // {
        //     name: "golang",
        //     file: 'go.mod',
        //     version: 'v0.8.0',
        //     content: `module example.com/m\n\nmodule example.com\nv0.8.0`
        // }
    ]

    test.each(PROJECT_DATA)('Detect version from %s', async ({ name, file, version, content }) => {
        const PROJECT_DIR = join(E2E_DIR, `test-project-${name}`)
        const filePath = join(PROJECT_DIR, file);
        await setupTest(PROJECT_DIR, filePath, content)

        const versionOutput = execSync(`grm version --detect --project-path ${filePath}`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })

        expect(versionOutput).toContain(`Current version: ${version}`)
        expect(versionOutput).toContain(`Using project file: ${filePath}`)

        await cleanTest(PROJECT_DIR)
    })
    test.each(PROJECT_DATA)('Auto-detect version from %s without specifying a file', async ({ name, file, version, content }) => {
        const PROJECT_DIR = join(E2E_DIR, `test-project-${name}`)
        const filePath = join(PROJECT_DIR, file);
        await setupTest(PROJECT_DIR, filePath, content)

        const versionOutput = execSync('grm version --detect', {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })

        expect(versionOutput).toContain(`Current version: ${version}`)
        expect(versionOutput).toContain(`Using project file: ${filePath}`)

        await cleanTest(PROJECT_DIR)
    })
})