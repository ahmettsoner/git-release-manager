import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import simpleGit, { SimpleGit } from 'simple-git'
import { GitVersionManager } from './GitVersionManager'

/**
 * Names in `directory` matching a SINGLE-SEGMENT filename pattern whose only
 * wildcard is `*`. Sorted, files only.
 *
 * ── WHY THIS EXISTS INSTEAD OF `glob` ────────────────────────────────────
 *
 * The project-file table below has exactly one wildcard in it, `*.csproj`:
 * one path segment, one star, a flat listing of the current directory. The
 * call site used to be `require('glob')` inside a function body, which bought
 * recursion, brace expansion, ignore lists and negation — none of them
 * reachable from that table.
 *
 * The cost was not a heavier install; it was a MISSING one. `glob` was never
 * declared in `dependencies`. It resolved transitively through
 * devDependencies in a development checkout, so it worked here and only here.
 * In a packaged install — `npm pack` + `npm install --global`, which ships
 * `dependencies` and nothing else — it is absent, and `grm version --detect`
 * dies with "Cannot find module 'glob'". Measured 2026-08-02 against
 * ~/.local/lib/node_modules/git-release-manager: nine e2e cases red, while the
 * same code passed from the source tree.
 *
 * Promoting `glob` to `dependencies` would also close it, and was rejected:
 * the version transitively present is 7.2.3, which is end-of-life, and glob 9+
 * renamed `sync` to `globSync`, so the honest options were "ship a deprecated
 * major" or "change this code anyway". `fs.globSync` closes it in one line but
 * arrived in Node 22, and package.json declares `engines: { node: '>=14' }` —
 * trading an undeclared dependency for a silently broken engine floor is the
 * same defect in different clothes.
 *
 * ── IT REFUSES WHAT IT CANNOT SERVE ──────────────────────────────────────
 *
 * A pattern with a path separator, `**`, or any other glob metacharacter needs
 * a real glob implementation. Returning "no match" for one would surface later
 * as "No supported project file found in current directory" — a sentence that
 * sounds true and describes the wrong thing. So it throws, naming the pattern.
 */
export function matchFilesInDirectory(pattern: string, directory: string): string[] {
    // Anything that is a glob metacharacter but not the `*` handled below.
    if (pattern.includes('**') || /[/\\?[\]{}()!+@]/.test(pattern)) {
        throw new Error(
            `Unsupported project file pattern '${pattern}': ` +
                `only single-segment names whose sole wildcard is '*' are supported.`
        )
    }

    // Split on `*` FIRST, then escape each literal chunk. That way the star is
    // never itself escaped, and every other regex metacharacter is.
    const source = pattern
        .split('*')
        .map(chunk => chunk.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('[^/]*')
    const matcher = new RegExp(`^${source}$`)

    let entries
    try {
        entries = readdirSync(directory, { withFileTypes: true })
    } catch {
        // An unreadable directory has no project file in it. The caller's own
        // "no supported project file found" is the right sentence here.
        return []
    }

    return entries
        .filter(entry => entry.isFile() || entry.isSymbolicLink())
        .map(entry => entry.name)
        // glob parity: a leading `*` does not match a leading dot, so
        // `*.csproj` must not select a file literally named `.csproj`.
        .filter(name => !(name.startsWith('.') && pattern.startsWith('*')))
        .filter(name => matcher.test(name))
        // glob.sync returns sorted results by default, and the caller takes
        // [0]. Without this the pick would follow readdir order, which is
        // filesystem-dependent — the same directory could resolve to a
        // different project file on a different machine.
        .sort()
}

interface ProjectVersion {
    currentVersion: string
    filePath: string
    update: (newVersion: string) => void
}

class PackageJsonVersion implements ProjectVersion {
    filePath: string

    constructor(path = 'package.json') {
        this.filePath = path
    }

    get currentVersion(): string {
        const content = JSON.parse(readFileSync(this.filePath, 'utf8'))
        return content.version
    }

    update(newVersion: string): void {
        const content = JSON.parse(readFileSync(this.filePath, 'utf8'))
        content.version = newVersion
        writeFileSync(this.filePath, JSON.stringify(content, null, 2))
    }
}

class CsprojVersion implements ProjectVersion {
    filePath: string

    constructor(path: string) {
        this.filePath = path
    }

    get currentVersion(): string {
        const content = readFileSync(this.filePath, 'utf8')
        const match = content.match(/<Version>(.*?)<\/Version>/)
        return match ? match[1] : '0.0.0'
    }

    update(newVersion: string): void {
        let content = readFileSync(this.filePath, 'utf8')
        content = content.replace(/<Version>.*?<\/Version>/, `<Version>${newVersion}</Version>`)
        writeFileSync(this.filePath, content)
    }
}

class PyProjectVersion implements ProjectVersion {
    filePath: string

    constructor(path = 'pyproject.toml') {
        this.filePath = path
    }

    get currentVersion(): string {
        const content = readFileSync(this.filePath, 'utf8')
        const match = content.match(/version\s*=\s*["'](.+?)["']/)
        return match ? match[1] : '0.0.0'
    }

    update(newVersion: string): void {
        let content = readFileSync(this.filePath, 'utf8')
        content = content.replace(/version\s*=\s*["'].+?["']/, `version = "${newVersion}"`)
        writeFileSync(this.filePath, content)
    }
}

class GradleVersion implements ProjectVersion {
    filePath: string

    constructor(path = 'build.gradle') {
        this.filePath = path
    }

    get currentVersion(): string {
        const content = readFileSync(this.filePath, 'utf8')
        const match = content.match(/version\s*=\s*['"](.+?)['"]/)
        return match ? match[1] : '0.0.0'
    }

    update(newVersion: string): void {
        let content = readFileSync(this.filePath, 'utf8')
        content = content.replace(/version\s*=\s*['"].+?['"]/, `version = '${newVersion}'`)
        writeFileSync(this.filePath, content)
    }
}

class GoModVersion implements ProjectVersion {
    filePath: string
    git: SimpleGit
    private latestVersion: string = '0.0.0'

    constructor(path = 'go.mod') {
        this.filePath = path
        this.git = simpleGit(process.cwd())

        // Fetch tags when the class is instantiated
        this.fetchLatestVersion()
    }

    get currentVersion(): string {
        return this.latestVersion
    }

    // Fetch the latest version from git tags
    private fetchLatestVersion() {
        this.git.tags()
            .then(tags => {
                if (tags.all.length > 0) {
                    const sortedTags = tags.all.sort(this.compareVersions)
                    this.latestVersion = sortedTags[sortedTags.length - 1]
                }
            })
            .catch(error => {
                console.error('Error fetching tags:', error)
            })
    }

    update(newVersion: string): void {
        this.git.addTag(newVersion, (err, result) => {
            if (err) {
                console.error('Error adding tag:', err)
            } else {
                console.log(`Tag added: ${newVersion}`)
                // Update internal state on success
                this.latestVersion = newVersion
            }
        })
    }

    private compareVersions(a: string, b: string): number {
        return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    }
}

export class ProjectVersionManager {
    private readonly PROJECT_FILES = [
        { pattern: 'package.json', handler: PackageJsonVersion },
        { pattern: '*.csproj', handler: CsprojVersion },
        { pattern: 'pyproject.toml', handler: PyProjectVersion },
        { pattern: 'build.gradle', handler: GradleVersion },
        { pattern: 'go.mod', handler: GoModVersion },
    ]

    private detectProjectFile(path?: string): { filePath: string; handler: any } {
        // Eğer path belirtilmişse, doğrudan o dosyayı kontrol et
        if (path) {
            const absolutePath = resolve(path)
            if (existsSync(absolutePath)) {
                // Dosya uzantısına göre handler'ı belirle
                const handler = this.PROJECT_FILES.find(f => absolutePath.endsWith(f.pattern.replace('*', '')))?.handler

                if (!handler) {
                    throw new Error(`Unsupported project file type: ${path}`)
                }

                return { filePath: absolutePath, handler }
            }
            throw new Error(`Project file not found at: ${path}`)
        }

        // Path belirtilmemişse, mevcut dizinde desteklenen ilk proje dosyasını bul
        for (const { pattern, handler } of this.PROJECT_FILES) {
            if (pattern.includes('*')) {
                // Wildcard patterns are matched against a flat listing of the
                // current directory — see matchFilesInDirectory for why this is
                // not `glob`.
                const files = matchFilesInDirectory(pattern, process.cwd())
                if (files.length > 0) {
                    return {
                        filePath: join(process.cwd(), files[0]),
                        handler,
                    }
                }
            } else {
                const filePath = join(process.cwd(), pattern)
                if (existsSync(filePath)) {
                    return { filePath, handler }
                }
            }
        }

        throw new Error('No supported project file found in current directory')
    }

    detectProjectVersion(path?: string): ProjectVersion {
        try {
            const { filePath, handler } = this.detectProjectFile(path)
            return new handler(filePath)
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to detect project version: ${error.message}`)
            }
            throw error
        }
    }
    async updateProjectVersion(newVersion?: string, path?: string): Promise<void> {
        try {
            if(!newVersion){
                const gitVersionManager = new GitVersionManager();
                newVersion = await gitVersionManager.getLatestTag();
            }
            const projectVersion = this.detectProjectVersion(path)
            const currentVersion = projectVersion.currentVersion

            // Versiyon güncellemesi
            projectVersion.update(newVersion)

            console.log(`Version updated in ${projectVersion.filePath}:`)
            console.log(`  ${currentVersion} -> ${newVersion}`)
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to update project version: ${error.message}`)
            }
            throw error
        }
    }

    getCurrentVersion(path?: string): string {
        const projectVersion = this.detectProjectVersion(path)
        return projectVersion.currentVersion
    }
}
