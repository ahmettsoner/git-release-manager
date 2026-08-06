import simpleGit from 'simple-git'
import { VersionCliArgs } from '../../commands/version/types/VersionCliArgs'
import { readConfig } from '../../config/configManager'
import { VersionStamper } from './VersionStamper'
import { getGitLogAsJson } from '../git/commits/commitProcessor'
import { BumpEvidence, deriveBump, explainBump } from './BumpDeriver'
import { GitVersionManager } from './GitVersionManager'
import { ProjectVersionManager } from './ProjectVersion'
import { ReleaseManager } from './ReleaseManager'
import { VersionValidator } from './VersionValidator'

export class VersionController {
    private gitManager: GitVersionManager
    private releaseManager: ReleaseManager
    private validator: VersionValidator
    private projectVersionManager: ProjectVersionManager

    constructor() {
        this.gitManager = new GitVersionManager()
        this.releaseManager = new ReleaseManager()
        this.validator = new VersionValidator()
        this.projectVersionManager = new ProjectVersionManager()
    }

    /**
     * resolveBaselineRef — turn a version STRING into a ref this repository has.
     *
     * Candidates in order: the string itself, then the configured prefix, then a
     * bare `v`. Ordered most-explicit-first so a caller that already passed a
     * real ref is never second-guessed, and `v` last because it is a convention
     * rather than this repository's declaration.
     */
    private async resolveBaselineRef(baseline: string, prefix?: string): Promise<string | null> {
        const git = simpleGit()
        const candidates = [baseline]
        if (prefix && !baseline.startsWith(prefix)) candidates.push(`${prefix}${baseline}`)
        if (!baseline.startsWith('v')) candidates.push(`v${baseline}`)

        for (const candidate of candidates) {
            try {
                const out = await git.raw(['rev-parse', '--verify', '--quiet', `${candidate}^{commit}`])
                // THE ANSWER IS THE SHA, NOT THE ABSENCE OF A THROW. `rev-parse
                // --verify --quiet` exits non-zero with EMPTY output when a ref
                // does not resolve, and that shape does not reliably surface as
                // a rejected promise here — measured: the first candidate was
                // accepted for a tag that does not exist, the range stayed
                // `1.0.0..HEAD`, and `git log` failed one call later in a place
                // that could no longer say which spelling was wrong.
                if (/^[0-9a-f]{40}/.test((out ?? '').trim())) return candidate
            } catch {
                // Not a ref here. Try the next spelling — this is a lookup, and a
                // miss is data, not a failure.
            }
        }
        return null
    }

    /**
     * deriveBumpFromRange — read the commits this version would cover and grade
     * them against the configured taxonomy.
     *
     * Returns null when the range cannot be established, and the caller then
     * proceeds with its normal default rather than failing. That is deliberate:
     * `--derive` asks the history for an OPINION, and a repository with no
     * baseline (the first version ever) genuinely has none to give. Refusing
     * there would make the first release the one command nobody can run.
     */
    private async deriveBumpFromRange(options: VersionCliArgs): Promise<BumpEvidence | null> {
        try {
            const config = await readConfig(options.config, options.environment)
            const baseline = options.from ?? (await this.gitManager.getLatestTag(options.prefix, options.channel))
            if (!baseline) return null

            // THE BASELINE IS A VERSION; THE RANGE NEEDS A REF, and they are not
            // the same string. `--from 1.0.0` is a perfectly good baseline for
            // the arithmetic — semver does not care about a `v` — while the tag
            // in the repository is `v1.0.0`, so handing it straight to `git log`
            // produces "ambiguous argument '1.0.0..HEAD'". The arithmetic then
            // still answers, from a range that was never read: a derivation that
            // silently graded nothing.
            //
            // --since IS THE CALLER SAYING THE TWO CANNOT BE INFERRED FROM EACH
            // OTHER. A project running several version LINES tags them
            // `<line>-vX.Y.Z`, so the baseline it hands over is the bare semver
            // core `1.0.0` while the ref that starts the range is
            // `catalystctl-v1.0.0`. Guessing from the core alone finds the
            // repository's OWN `v1.0.0` — a real tag, at the wrong point in
            // history — and the derivation then grades a range belonging to a
            // different line. Measured: a component whose tree had not been
            // touched derived a patch bump from another line's commits.
            const from = options.since
                ? await this.resolveBaselineRef(options.since, options.prefix)
                : await this.resolveBaselineRef(baseline, options.prefix)
            if (!from) {
                console.error(
                    `bump: ${options.since ? `range start '${options.since}'` : `baseline '${baseline}'`} ` +
                    `does not resolve to a ref in this repository, ` +
                    `so there is no range to grade; falling back to the flags given`
                )
                return null
            }

            const to = options.to ?? 'HEAD'
            // --no-merges: a merge commit carries no type and never could. Its
            // content is the commits it joins, and those are in this range too.
            //
            // --paths scopes the derivation to ONE component's tree. Without it
            // a repository with several independently-versioned products grades
            // every one of them against every commit, so a fix in product A
            // bumps product B — and the two lines, whose whole purpose is to be
            // independent, move in lockstep while each claims to be its own.
            // `--` separates pathspecs from revisions; without it git resolves a
            // path that happens to look like a ref and answers about the wrong
            // thing.
            const pathspecs = (options.paths ?? '').split(/\s+/).filter(Boolean)
            const logArgs = ['--no-merges', ...(pathspecs.length ? ['--', ...pathspecs] : [])]
            const commits = await getGitLogAsJson(`${from}..${to}`, logArgs)
            if (!commits?.length) return null
            return deriveBump(commits, config)
        } catch (error) {
            // A derivation that cannot run must not take the version path down
            // with it — the caller still has an explicit default. It says so on
            // stderr, because a SILENT fallback would look exactly like a range
            // that legitimately voted patch.
            console.error(
                `bump: could not derive from history (${error instanceof Error ? error.message : String(error)}); ` +
                `falling back to the flags given`
            )
            return null
        }
    }

    /**
     * withConfiguredPrefix — let `tag.prefix` in the config be the default for
     * `--prefix`.
     *
     * WHY THIS EXISTS. The prefix was DECLARED in three places and read in one.
     * Measured 2026-08-06: `tag.prefix` (a project config), `tag.format` (the
     * packaged default and the Config type) and `config.tagPrefix` (read by
     * FlowManager, declared by no config, so it interpolated the string
     * "undefined" into its patterns). The only live knob was the CLI flag. A
     * setting a project writes and nothing reads is worse than no setting: the
     * next reader assumes the prefix is configured and it is not.
     *
     * THE FLAG STILL WINS, always. A caller that passes --prefix has said
     * something more specific than the file, and a caller that passes NOTHING
     * on a project with no tag.prefix gets exactly today's behaviour — so this
     * cannot change what any existing invocation does.
     */
    private async withConfiguredPrefix(options: VersionCliArgs): Promise<VersionCliArgs> {
        if (options.prefix !== undefined) return options
        try {
            const config = await readConfig(options.config, options.environment)
            const prefix = config?.tag?.prefix
            if (typeof prefix === 'string' && prefix.length > 0) return { ...options, prefix }
        } catch {
            // A config that cannot be read is not a reason to fail a version
            // command that never needed it.
        }
        return options
    }

    /**
     * maybeStamp — write the version into the files the project declared.
     *
     * Never fatal by default. Stamping is a CONVENIENCE over a version that has
     * already been decided and, at this point, already recorded; failing the
     * command here would leave the caller believing no version was cut when one
     * was. A file the project marked `required` still throws — that is the
     * project saying the stamp is not a convenience — and the throw reaches the
     * outer catch, which is why this does not swallow those.
     */
    private async maybeStamp(version: string, options: VersionCliArgs): Promise<void> {
        if ((options as any).skipStamp) return
        let config
        try {
            config = await readConfig(options.config, options.environment)
        } catch {
            return   // no config, nothing declared, nothing to stamp
        }
        if (!config) return
        const stamper = new VersionStamper(config, process.cwd())
        if (!stamper.configured) return
        if (!stamper.onBump && !(options as any).stamp) return

        const result = await stamper.stamp(version)
        console.error(`stamp: ${VersionStamper.describe(result)}`)
        // An UNMATCHED file is the silent-failure case this feature exists to
        // prevent, so it is named individually rather than left as a count.
        for (const f of result.unmatched) {
            console.error(`stamp: WARNING ${f} — the configured pattern matched nothing; not stamped`)
        }
    }

    async handleVersionCommand(options: VersionCliArgs): Promise<void> {
        try {
            options = await this.withConfiguredPrefix(options)
            // Validate version manipulation options
            this.validator.validateVersionOptions(options)

            if (options.reset) {
                await this.gitManager.resetVersion()
                return
            }

            if (options.detect) {
                const projectVersion = this.projectVersionManager.detectProjectVersion(options.projectPath)
                console.log(`Using project file: ${projectVersion.filePath}\nCurrent version: ${projectVersion.currentVersion}`)

                // Eğer version manipulation flag'leri varsa, versiyon güncelleme işlemlerini yap
                if (options.major || options.minor || options.patch) {
                    // TODO: Implement version update logic
                    // await this.updateVersionInFile(projectFile, newVersion)
                }

                return
            }

            if (options.update) {
                // Versiyon güncelleme
                const projectVersion = typeof options.update === 'string' ? options.update : undefined

                await this.projectVersionManager.updateProjectVersion(projectVersion, options.projectPath)
                return
            }

            // Handle different version commands
            if (options.list) {
                await this.gitManager.listVersions(options.list === true ? 10 : parseInt(options.list as string))
                return
            }

            if (options.latest) {
                await this.gitManager.showLatestVersion()
                return
            }

            if (options.compare) {
                await this.gitManager.compareVersions(options.compare)
                return
            }

            if (options.revert) {
                await this.gitManager.revertToVersion(options.revert, options.push)
                return
            }

            if (options.validate) {
                this.validator.validateVersionFormat(options.validate)
                return
            }

            if (options.sync) {
                await this.gitManager.syncVersions(options.push)
                return
            }

            // --derive: let the COMMITS name the bump, through the taxonomy this
            // project already configured for its changelog.
            //
            // AN EXPLICIT FLAG ALWAYS WINS, and quietly. `--derive --minor` is an
            // operator saying something the history cannot know — a compatibility
            // break nobody marked, a release deliberately held back — and a tool
            // that argued there would be overruled by hand every time until
            // somebody stopped passing --derive at all.
            //
            // THE RANGE IS THE BASELINE'S. Whatever version this run bumps FROM
            // is the only defensible start: it names the commit the previous
            // version pointed at, so the range is exactly the work that is new.
            // A wider range re-grades released commits and would re-derive the
            // same major forever once one lands.
            if (options.derive && !options.major && !options.minor && !options.patch) {
                const evidence = await this.deriveBumpFromRange(options)
                if (evidence) {
                    if (options.explainBump) console.error(`bump: ${explainBump(evidence)}`)
                    options = { ...options, [evidence.bump]: true }
                }
            }

            // Handle version creation/update
            let newVersion = ''
            if (options.version) {
                newVersion = options.version
            } else if (options.init) {
                newVersion = await this.gitManager.initVersion(options)
            } else {
                newVersion = await this.gitManager.generateNewVersion(options)
            }
            // --dry-run: answer "what WOULD be cut" without cutting.
            //
            // Every other path here mutates — createVersion writes release
            // notes, createGitTag moves refs, push touches the remote — so
            // asking the question used to mean performing the answer. A
            // release plane whose only way to report the next version is to
            // MINT it cannot be consulted by anything upstream: a build that
            // wants to stamp the version it is about to produce, a CI gate
            // checking the bump is the intended one, or an operator simply
            // looking. The version is printed on stdout ALONE so it can be
            // captured with $(...); everything explanatory goes to stderr.
            if (options.dryRun) {
                console.error(`dry-run: would create ${newVersion} (nothing was written)`)
                console.log(newVersion)
                return
            }

            await this.releaseManager.createVersion(newVersion, options)

            // ── STAMP THE WORKING TREE, BEFORE THE TAG ────────────────────
            //
            // The order is the whole point. A tag is a pointer to a COMMIT, so
            // stamping after tagging produces a tag whose files still say the
            // previous version — the artefact built from that tag then carries
            // a number that contradicts the tag it was built from, and the
            // contradiction is invisible until somebody installs it.
            //
            // Opt-in twice over: nothing happens unless `versioning.stamp.files`
            // is configured, and even then only with `--stamp` or
            // `versioning.stamp.onBump`. A project that has never heard of this
            // feature must behave on upgrade exactly as it did before.
            await this.maybeStamp(newVersion, options)

            // Create git tag
            if (options.tag !== false) {
                // Default to true if not explicitly set to false
                // The note becomes the ANNOTATED TAG'S BODY. It was being
                // dropped: createGitTag was called without it, so the tag
                // message defaulted to the version string and the release note
                // lived only wherever createVersion put it. An annotated tag
                // whose body merely repeats its own name records nothing —
                // "who cut this, from what, and why" is the entire reason the
                // tag is an object rather than a ref.
                await this.gitManager.createGitTag(newVersion, options.note)
                console.log(`Created tag: ${newVersion}`)
            }

            // Push changes if requested
            if (options.push) {
                await this.gitManager.pushChanges(newVersion, options.branch)
                console.log('Pushed changes to remote')
            }
        } catch (error) {
            console.error('Error:', error instanceof Error ? error.message : String(error))
            process.exit(1)
        }
    }
}
