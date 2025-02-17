import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import { createEmptyTestWorkspace } from '../projectSetup'

describe('E2E: Version update command', () => {
    const E2E_DIR = join(__dirname, '../../../temp/test/e2e/version/update')
    
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
    ]

    test.each(PROJECT_DATA)('Update version in %s file', async ({ name, file, initialVersion, updatedVersion, content }) => {
        const PROJECT_DIR = join(E2E_DIR, `test-project-${name}`)
        await createEmptyTestWorkspace(PROJECT_DIR, {
            withGit: true,
            withNpm: true,
            withGitHub: true
        })
        fs.mkdirSync(PROJECT_DIR, { recursive: true })

        const filePath = join(PROJECT_DIR, file)
        fs.writeFileSync(filePath, content)

        // Run the update command to change the version
        execSync(`grm version --update ${updatedVersion}`, {
            cwd: PROJECT_DIR,
            encoding: 'utf8'
        })

        // Read the updated content and verify the version
        const updatedContent = fs.readFileSync(filePath, 'utf8')
        expect(updatedContent).toContain(updatedVersion)

        // Clean up the project directory after the test
        fs.rmSync(PROJECT_DIR, { recursive: true, force: true })
    })
})