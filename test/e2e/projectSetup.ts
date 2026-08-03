import fs from 'fs'
import { join } from 'path'
import simpleGit from 'simple-git'

interface ProjectSetupOptions {
    withGit?: boolean
    withNpm?: boolean
    withGitHub?: boolean
    initialVersion?: string
}

// The fixture's bootstrap branch, pinned rather than inherited.
//
// `git init` used to take whatever `init.defaultBranch` the box declared. On a
// box configured with `main` — now the git default — every test that CREATES
// main (`checkoutLocalBranch('main')`, 20+ call sites) died with "a branch named
// 'main' already exists", and the two that check out `master` died with a
// pathspec error. 38 assertions therefore depended on a global git config that
// no fixture set and no assertion named.
//
// `master` is the name the suite was authored against: workflow.test.ts renames
// it to main on purpose, and -feature/-hotfix check it out by name. Pinning it
// here restores that environment and, more to the point, makes the answer the
// same on every box. It says nothing about the product's own branch topology —
// config.json still declares `main`, and it is a different question.
const BOOTSTRAP_BRANCH = 'master'

// Start from an empty directory, always.
//
// Both entry points only ever did `mkdirSync({recursive: true})`, which is a
// no-op on an existing tree — so a second `test.each` case reusing the same
// PROJECT_DIR inherited the first case's tags and `grm version --init` refused
// with "Repository already has tags" (38 assertions). The same leftovers made a
// local re-run of the suite measure the PREVIOUS run.
async function freshDirectory(projectPath: string) {
    await fs.promises.rm(projectPath, { recursive: true, force: true })
    fs.mkdirSync(projectPath, { recursive: true })
}

async function initRepository(projectPath: string) {
    const git = simpleGit(projectPath)
    await git.init([`--initial-branch=${BOOTSTRAP_BRANCH}`])
    await git.addConfig('user.name', 'E2E Test')
    await git.addConfig('user.email', 'e2e@test.com')
    await git.add('.')
    await git.commit('initial commit', [], { '--allow-empty': null })
}

export async function createEmptyTestWorkspace(
    projectPath: string,
    options: ProjectSetupOptions
) {
    // 1. Proje dizini oluştur
    await freshDirectory(projectPath)

    // 3. Git repo oluştur
    if (options.withGit) {
        await initRepository(projectPath)
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
    await freshDirectory(projectPath)

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
        await initRepository(projectPath)
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
export async function cleanupTestProject(projectPath: string) {
    if (fs.existsSync(projectPath)) {
        try {
            await fs.promises.rm(projectPath, { recursive: true, force: true })
        } catch (error) {
            console.error('Error occured when test directory cleaning:', error)
        }
    }
}