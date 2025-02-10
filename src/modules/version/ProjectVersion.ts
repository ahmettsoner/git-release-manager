import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'

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

    constructor(path = 'go.mod') {
        this.filePath = path
    }

    get currentVersion(): string {
        const content = readFileSync(this.filePath, 'utf8')
        const match = content.match(/module\s+.+\s+v(.+)/)
        return match ? match[1] : '0.0.0'
    }

    update(newVersion: string): void {
        let content = readFileSync(this.filePath, 'utf8')
        content = content.replace(/(module\s+.+\s+v).+/, `$1${newVersion}`)
        writeFileSync(this.filePath, content)
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
                // Wildcard içeren dosya isimleri için glob kullanılabilir
                const glob = require('glob')
                const files = glob.sync(pattern, { cwd: process.cwd() })
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
    async updateProjectVersion(newVersion: string, path?: string): Promise<void> {
        try {
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
