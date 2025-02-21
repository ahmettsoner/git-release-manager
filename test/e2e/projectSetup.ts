import fs from 'fs'
import { join } from 'path'
import simpleGit from 'simple-git'

interface ProjectSetupOptions {
    withGit?: boolean
    withNpm?: boolean
    withGitHub?: boolean
    initialVersion?: string
}

export async function createEmptyTestWorkspace(
    projectPath: string,
    options: ProjectSetupOptions
) {
    // 1. Proje dizini oluştur
    fs.mkdirSync(projectPath, { recursive: true })

    // 3. Git repo oluştur
    if (options.withGit) {
        const git = simpleGit(projectPath)
        await git.init()
        await git.addConfig('user.name', 'E2E Test')
        await git.addConfig('user.email', 'e2e@test.com')
        await git.add('.')
        await git.commit('initial commit', [], { '--allow-empty': null });
    }

    // 5. GitHub API mock
    if (options.withGitHub) {
        setupGitHubMock()
    }

    return projectPath
}

export async function createTestProject(
    projectPath: string,
    options: ProjectSetupOptions
) {
    // 1. Proje dizini oluştur
    fs.mkdirSync(projectPath, { recursive: true })

    // 2. Package.json oluştur
    const packageJson = {
        name: 'e2e-test-project',
        version: options.initialVersion || '1.0.0',
        scripts: {
            test: 'jest',
            build: 'tsc'
        }
    }
    fs.writeFileSync(
        join(projectPath, 'package.json'),
        JSON.stringify(packageJson, null, 2)
    )

    // 3. Git repo oluştur
    if (options.withGit) {
        const git = simpleGit(projectPath)
        await git.init()
        await git.addConfig('user.name', 'E2E Test')
        await git.addConfig('user.email', 'e2e@test.com')
        await git.add('.')
        await git.commit('initial commit', [], { '--allow-empty': null });
    }

    // 4. npm init
    if (options.withNpm) {
        fs.mkdirSync(join(projectPath, 'node_modules'), { recursive: true })
    }

    // 5. GitHub API mock
    if (options.withGitHub) {
        setupGitHubMock()
    }

    return projectPath
}

function setupGitHubMock() {
    // GitHub API mock implementation
}

// Diğer yardımcı fonksiyonlar
export function cleanupTestProject(projectPath: string) {
    if (fs.existsSync(projectPath)) {
        fs.rmSync(projectPath, { recursive: true, force: true })
    }
}