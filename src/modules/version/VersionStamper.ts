import { existsSync, readFileSync, writeFileSync } from 'fs'
import { isAbsolute, join, resolve } from 'path'
import simpleGit from 'simple-git'

import { Config } from '../../config/types/Config'
import { StampFile } from '../../config/types/Versioning'
import { matchFilesInDirectory } from './ProjectVersion'

/**
 * VersionStamper — write the version INTO the working tree, from config.
 *
 * ── WHY THIS IS NOT ProjectVersionManager ──
 *
 * ProjectVersionManager already writes a version into a project file, and it is
 * the wrong tool for this job in a way worth stating: its table is a fixed list
 * of ECOSYSTEM manifests (package.json, *.csproj, pyproject.toml, build.gradle,
 * go.mod), each with a handler that knows that format's version field. It
 * answers "what is this project's version" for a project that has exactly one.
 *
 * The files a repository actually needs stamped are usually none of those — a
 * plugin manifest, a chart's appVersion, a Go constant, a VERSION file, forty
 * manifests under one directory. There is no handler to write and no ecosystem
 * to detect: there is a path, a pattern, and a replacement, and only the project
 * knows them. So they come from the config, and this class contains no knowledge
 * of any particular file.
 *
 * ── WHAT IT REFUSES TO DO SILENTLY ──
 *
 * 1. A PATTERN THAT MATCHES NOTHING. The file exists, the write "succeeds", and
 *    the version is not in it — the failure mode this whole feature is supposed
 *    to prevent, arriving through the feature itself. An unmatched file is
 *    reported, and with `required: true` it throws. It is never counted as
 *    stamped.
 * 2. A COMMIT OF ANYTHING IT DID NOT WRITE. The commit is `git add --` over the
 *    exact paths stamped, never `-a` and never a bare `add .`. On a shared
 *    checkout — several agents committing into one index, which is where this
 *    tool is used — a broad add silently carries someone else's work into your
 *    commit.
 * 3. A COMMIT WITH NOTHING IN IT. If no file changed, there is no commit. An
 *    empty commit on every release is noise that hides the releases that did
 *    stamp something.
 *
 * ── THE VERSION IT WRITES IS THE ONE IT WAS GIVEN ──
 *
 * No derivation, no reading of tags, no prefix logic. The caller has already
 * decided what the version is; a stamper that re-derived it would be a second
 * opinion, and the two would differ on exactly the release where it matters.
 */

export interface StampResult {
    /** Repo-relative paths whose contents changed. */
    stamped: string[]
    /** Files that matched a configured entry but whose pattern found nothing. */
    unmatched: string[]
    /** Configured paths that do not exist (and were not `required`). */
    missing: string[]
    /** Files already carrying this version — matched, but byte-identical after. */
    unchanged: string[]
    /** The commit sha, when one was made. */
    commit?: string
}

export class VersionStamper {
    constructor(
        private readonly config: Config,
        private readonly root: string = process.cwd()
    ) {}

    /** Whether the project has asked for any stamping at all. */
    get configured(): boolean {
        return (this.config?.versioning?.stamp?.files?.length ?? 0) > 0
    }

    /** Whether a bump should stamp without being asked. Opt-in, default off. */
    get onBump(): boolean {
        return this.configured && this.config.versioning?.stamp?.onBump === true
    }

    /**
     * Expand one configured entry to concrete files.
     *
     * The wildcard rules are ProjectVersion's, deliberately: one matcher in the
     * codebase, one set of refusals, one place that has been told why `glob` is
     * not used here. A pattern this matcher cannot serve throws by name rather
     * than resolving to "no files", which would read as "nothing to stamp".
     */
    private expand(entry: StampFile): string[] {
        const rel = entry.path
        if (!rel.includes('*')) {
            return [rel]
        }
        const idx = rel.lastIndexOf('/')
        const dir = idx === -1 ? '' : rel.slice(0, idx)
        const base = idx === -1 ? rel : rel.slice(idx + 1)
        const abs = isAbsolute(dir) ? dir : join(this.root, dir)
        if (!existsSync(abs)) return []
        return matchFilesInDirectory(base, abs).map(f => (dir ? `${dir}/${f}` : f))
    }

    /**
     * Substitute the placeholders a project may use in `replace` and in the
     * commit message. `{versionCore}` exists because a tag prefix belongs to the
     * LINE, not to the version: a manifest field that must parse as semver
     * cannot hold `v1.2.3`, and a project should not have to strip it with a
     * regex in the replacement string.
     */
    private fill(template: string, version: string): string {
        const core = version.replace(/^[^0-9]*/, '')
        return template
            .replace(/\{version\}/g, version)
            .replace(/\{versionCore\}/g, core)
    }

    async stamp(version: string, opts: { dryRun?: boolean } = {}): Promise<StampResult> {
        const out: StampResult = { stamped: [], unmatched: [], missing: [], unchanged: [] }
        const stampCfg = this.config?.versioning?.stamp
        if (!stampCfg?.files?.length) return out

        for (const entry of stampCfg.files) {
            const files = this.expand(entry)
            if (files.length === 0) {
                if (entry.required) {
                    throw new Error(
                        `Version stamp: required path '${entry.path}' matched no file under ${this.root}.`
                    )
                }
                out.missing.push(entry.path)
                continue
            }

            for (const rel of files) {
                const abs = isAbsolute(rel) ? rel : resolve(this.root, rel)
                if (!existsSync(abs)) {
                    if (entry.required) {
                        throw new Error(`Version stamp: required file '${rel}' does not exist.`)
                    }
                    out.missing.push(rel)
                    continue
                }

                const before = readFileSync(abs, 'utf8')
                // `m` so `^`/`$` anchor per LINE: the overwhelmingly common
                // shape is a single `version:` line, and without it a pattern
                // anchored at `^` can only ever match the first line of a file.
                const re = new RegExp(entry.pattern, entry.flags ?? 'm')
                // `test` on a /g regex ADVANCES lastIndex, and the same object
                // is reused for the replace below. `String.replace` happens to
                // reset it, so this is currently harmless — and it is reset
                // explicitly anyway, because "harmless because of what the
                // other method does" is exactly the kind of coupling that
                // breaks when one of the two lines moves.
                const matched = re.test(before)
                re.lastIndex = 0
                if (!matched) {
                    if (entry.required) {
                        throw new Error(
                            `Version stamp: pattern /${entry.pattern}/ found nothing in required file '${rel}'.`
                        )
                    }
                    out.unmatched.push(rel)
                    continue
                }

                const after = before.replace(re, this.fill(entry.replace, version))
                if (after === before) {
                    out.unchanged.push(rel)
                    continue
                }
                if (!opts.dryRun) writeFileSync(abs, after)
                out.stamped.push(rel)
            }
        }

        if (!opts.dryRun && out.stamped.length > 0 && stampCfg.commit?.enabled) {
            const git = simpleGit(this.root)
            // PATHSPEC, never `-a`. See refusal 2 in the header.
            await git.add(['--', ...out.stamped])
            const msg = this.fill(
                stampCfg.commit.message ?? 'chore(version): stamp {version}',
                version
            )
            const res = await git.commit(msg, out.stamped)
            out.commit = res.commit || undefined
        }

        return out
    }

    /** A one-line human summary — the shape a CLI prints on STDERR. */
    static describe(r: StampResult): string {
        const bits = [`${r.stamped.length} stamped`]
        if (r.unchanged.length) bits.push(`${r.unchanged.length} already current`)
        if (r.unmatched.length) bits.push(`${r.unmatched.length} UNMATCHED`)
        if (r.missing.length) bits.push(`${r.missing.length} missing`)
        if (r.commit) bits.push(`committed ${r.commit.slice(0, 10)}`)
        return bits.join(' · ')
    }
}
