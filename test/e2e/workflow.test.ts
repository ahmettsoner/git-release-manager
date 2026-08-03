import { execSync } from 'child_process'
import { join } from 'path'
import fs from 'fs'
import simpleGit, { SimpleGit } from 'simple-git'
import { cleanupTestProject, createTestProject } from './projectSetup'

describe('E2E: Complete Release Workflow', () => {
    // '../../temp', not '../../../temp'. This file sits at test/e2e/, one level
    // ABOVE every other e2e test (test/e2e/<group>/), and copied their relative
    // path verbatim -- so the extra '..' walked out of the repository and this
    // suite created <repo>/../temp, a directory in whatever happens to contain
    // the checkout. Measured 2026-08-02: /home/ahmet.soner/AS/prj/temp existed,
    // holding the empty skeleton afterAll's cleanup left behind. The '.gitignore'
    // path below was correct at '../../', which is exactly what hid this: the
    // ignore rule was aimed at the repo while the mess was made outside it.
    const E2E_DIR = join(__dirname, '../../temp/test/e2e')
    const PROJECT_DIR = join(E2E_DIR, 'test-project')
    let git: SimpleGit

    beforeAll(async () => {
        // NO .gitignore MUTATION HERE. This block used to append
        // "# Test temporary files\ntemp/" to the repository's TRACKED
        // .gitignore at test time, creating it first if absent. Two things were
        // wrong with it, and only one of them was visible:
        //
        //   * a test run dirtied a tracked file, so `git status` after `npm
        //     test` reported a modification nobody made. It is quiet TODAY only
        //     because the append already landed and was committed -- the guard
        //     `includes('temp/')` now short-circuits. Revert that line and the
        //     leak returns; the defect never went away, its symptom did.
        //   * an ignore rule is repository configuration, not test setup. It
        //     belongs in the committed .gitignore, where it now is, reviewable
        //     and diffable, rather than being reconstructed by whichever suite
        //     happens to run first.
        //
        // The suite writes <repo>/temp, .gitignore ignores temp/, and neither
        // fact is discovered at runtime any more.
        await cleanupTestProject(E2E_DIR);
        fs.mkdirSync(E2E_DIR, { recursive: true })

        // Gerçek bir proje ortamı oluştur
        await createTestProject(PROJECT_DIR, {
            withGit: true,
            withNpm: true,
            withGitHub: true // GitHub API mock
        })
        git = simpleGit(PROJECT_DIR)
        // Initialize main branch with initial commit
        await git.init()
        await git.addConfig('user.name', 'Test User')
        await git.addConfig('user.email', 'test@example.com')
        // Add remote origin URL
        await git.addConfig('remote.origin.url', 'https://github.com/test-user/test-repo.git')

        fs.writeFileSync(join(PROJECT_DIR, 'README.md'), '# Test Project')
        await git.add('.')
        await git.commit('Initial commit')
        await git.branch(['-M', 'main']) // Rename master to main if needed
    })

    afterAll(async () => {
        await cleanupTestProject(E2E_DIR);
    })

    test('Complete release workflow', async () => {
    //     // 1. Feature branch oluştur
    //     execSync('grm branch create feature new-feature', { cwd: PROJECT_DIR })

    //     // 2. Ensure src directory exists and make changes to project files
    //     const srcDir = join(PROJECT_DIR, 'src')
    //     if (!fs.existsSync(srcDir)) {
    //         fs.mkdirSync(srcDir, { recursive: true })
    //     }

    //     // 2. Proje dosyalarında değişiklik yap
    //     fs.writeFileSync(
    //         join(PROJECT_DIR, 'src/index.js'),
    //         'console.log("new feature")'
    //     )

    //     // 3. Commit at
    //     await git.add('.')
    //     await git.commit('feat: add new feature')

    //     // 4. PR oluştur ve merge et
    //     // execSync('grm branch create feature new-feature', { cwd: PROJECT_DIR })
    //     // PR merge simulasyonu
    //     await git.checkout('main')
    //     await git.merge(['feature/new-feature'])

    //     // 5. Versiyon güncelle
    //     const versionOutput = execSync('grm version -p --update', { 
    //         cwd: PROJECT_DIR,
    //         encoding: 'utf8'
    //     })
    //     expect(versionOutput).toContain('Version updated')

    //     // 6. Changelog oluştur
    //     const changelogOutput = execSync('grm changelog generate --from HEAD~1', {
    //         cwd: PROJECT_DIR,
    //         encoding: 'utf8'
    //     })
    //     expect(changelogOutput).toContain('new feature')

    //     // 7. Release oluştur
    //     const releaseOutput = execSync('grm version --push', {
    //         cwd: PROJECT_DIR,
    //         encoding: 'utf8'
    //     })
    //     expect(releaseOutput).toContain('Release created')

    //     // 8. Sonuçları doğrula
    //     const packageJson = JSON.parse(
    //         fs.readFileSync(join(PROJECT_DIR, 'package.json'), 'utf8')
    //     )
    //     expect(packageJson.version).toMatch(/\d+\.\d+\.\d+/)

    //     const tags = await git.tags()
    //     expect(tags.all).toContain(`v${packageJson.version}`)

    //     const changelog = fs.readFileSync(
    //         join(PROJECT_DIR, 'CHANGELOG.md'),
    //         'utf8'
    //     )
    //     expect(changelog).toContain('new feature')
    })
})

// Daha spesifik E2E test senaryoları
describe('E2E: Version Management Scenarios', () => {
    test('Multiple project files version sync', async () => {
        // Test multiple project files (package.json, .csproj, etc.)
    })

    test('Release with multiple branches', async () => {
        // Test release process across multiple branches
    })
})

describe('E2E: CI/CD Integration', () => {
    test('Automated release workflow in CI', async () => {
        // Simulate CI environment
        process.env.CI = 'true'
        process.env.GITHUB_TOKEN = 'mock-token'
        
        // Test CI specific workflow
    })
})