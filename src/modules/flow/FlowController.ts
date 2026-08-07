import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import semver from 'semver'
import simpleGit, { SimpleGit } from 'simple-git'

import { Config } from '../../config/types/Config'
import { FlowPhase } from '../../config/types/Flow'
import { GitCommit } from '../git/types/GitCommit'
import { deriveBump, explainBump } from '../version/BumpDeriver'

/**
 * FlowController — run a declared phase: promote a branch, derive the version
 * from the commits, tag it.
 *
 * ── THE NUMBER COMES FROM THE HISTORY, NOT FROM A NAME ──
 *
 * This is the one property the existing flow surfaces do not have.
 * `branch finish` reads the version out of the branch name
 * (`release/1.4.0` → `1.4.0`), which means the bump derivation — the whole
 * commitTypes/noteTypes taxonomy a project configures for its changelog — is
 * bypassed on the only path where it matters. Here the range is
 * `<latest tag on this line>..<the phase's branch>` and `deriveBump` grades it,
 * so `feat:` moves the minor whether or not anybody typed a number.
 *
 * ── AND IT IS COMPUTED AFTER THE MERGE, DELIBERATELY ──
 *
 * A promotion's version must describe the work it promotes. Derive before the
 * merge and the range is empty (the target branch has not moved yet), so the
 * derivation falls to the default and a release full of features gets a patch
 * bump. Every step still reports success. So: merge, then derive, then tag —
 * and the tag lands on the merge commit, which is the commit that carries the
 * work.
 *
 * ── WHAT IT REFUSES ──
 *
 * · an unknown phase, listing the ones the project declared
 * · a promotion with nothing to promote (the source carries no commit the
 *   target lacks) — that would mint a version for no change
 * · a fast-forward merge unless the phase asked for `ff` in writing: a
 *   fast-forward creates no commit, so a pre-merge hook never runs and every
 *   gate hung on the promotion silently does not execute
 * · deleting the source branch unless the phase asked for it. On a long-lived
 *   integration line that is not a cleanup, it is an outage.
 */

const OWNER_TOKEN = "FlowController/v1"

export interface FlowPlan {
    phase: string
    branch: string
    channel?: string
    mergeFrom?: string
    /** Commits the source carries that the target does not. */
    ahead: number
    /** Commits the TARGET carries that the source does not — a divergence. */
    behind: number
    current: string
    next: string
    bumpWhy?: string
    willTag: boolean
    willDeleteSource: boolean
    mergeStrategy: "no-ff" | "ff"
    worktree?: string
}

export class FlowController {
    private readonly git: SimpleGit

    constructor(
        private readonly config: Config,
        private readonly root: string = process.cwd()
    ) {
        this.git = simpleGit(this.root)
    }

    /** The phase declaration, or a refusal that names what IS declared. */
    phase(name: string): FlowPhase {
        const phases = this.config?.flow?.phases
        if (!phases || Object.keys(phases).length === 0) {
            throw new Error(
                "No flow is declared. Add a `flow.phases` block to the config " +
                "(see src/config/types/Flow.ts) naming each phase's branch."
            )
        }
        const p = phases[name]
        if (!p) {
            throw new Error(
                `Unknown phase '${name}'. Declared: ${Object.keys(phases).join(", ")}`
            )
        }
        if (!p.branch) {
            throw new Error(`Phase '${name}' declares no branch.`)
        }
        return p
    }

    private prefixOf(p: FlowPhase): string {
        return p.prefix ?? this.config?.tag?.prefix ?? ""
    }

    private strategyOf(p: FlowPhase): "no-ff" | "ff" {
        return p.merge === "ff" ? "ff" : "no-ff"
    }

    /**
     * The highest tag on THIS line, reachable from the phase's branch.
     *
     * The line is `lineTags` (annotated + reachable + version-sorted); this adds
     * the one filter that is specific to the baseline question. A phase with a
     * channel wants that channel's newest tag; a stable phase must not adopt a
     * prerelease as its baseline, or every stable cut would inherit `-dev.N` and
     * never leave it.
     */
    async currentVersion(p: FlowPhase): Promise<string> {
        const prefix = this.prefixOf(p)
        for (const name of await this.lineTags(p)) {
            const core = name.slice(prefix.length)
            if (p.channel) {
                if (!core.includes(`-${p.channel}.`)) continue
            } else if (core.includes("-")) {
                continue
            }
            return name
        }
        return ""
    }

    /**
     * Every annotated tag on this line, newest-version first, reachable from the
     * phase's branch. One walk; the baseline questions above and in
     * `nextVersion` filter it.
     *
     * Three filters, and each one is load-bearing. ANNOTATED only
     * (`%(objecttype)` is `tag`): a lightweight tag carries no tagger, so it
     * records nothing about who cut it. REACHABLE from the branch (`--merged`):
     * a tag on a side branch names code this line never carried. Sorted by
     * VERSION, not lexically — `-v:refname`, because a lexical sort puts
     * v1.10.0 below v1.9.0 and the baseline would walk backwards on the tenth
     * minor.
     *
     * ── 🔴 REACHABILITY IS READ FROM STDOUT, NEVER FROM AN EXIT CODE ──
     *
     * This used to enumerate every tag and then ask, per tag,
     * `merge-base --is-ancestor <tag>^{commit} <branch>`, mapping a resolved
     * promise to `true` and a rejection to `false`. That command answers ONLY
     * through its exit status: 0 ancestor, 1 not an ancestor, and it prints
     * nothing either way. simple-git 3.27.0 RESOLVES a non-zero exit whose
     * stderr is empty — measured, and `git tag --merged` in FlowManager already
     * avoids the idiom — so `.then(() => true)` fired for BOTH answers and the
     * filter passed every tag. Consequence on the repository this tool manages:
     * `flow next prod` baselined on v1.6.0, a tag that lives only on `dev`, and
     * answered v1.7.0 where the release line stood at v1.0.8 and the correct
     * answer was v1.1.0 — six minor versions ahead, reported as a success.
     * VersionController.resolveBaselineRef carries the same warning for
     * `rev-parse --verify --quiet`: THE ANSWER IS THE OUTPUT, NOT THE ABSENCE
     * OF A THROW.
     *
     * `for-each-ref --merged=<branch>` moves the answer onto stdout, and it
     * costs ONE process instead of one per tag. Both failure directions now
     * converge on the SAME safe answer: if git fails, and whether the wrapper
     * rejects (the catch below) or resolves with empty output, the result is an
     * empty set — no baseline rather than a foreign one. A phase whose branch
     * does not exist yet lands here too, which is the answer it had before.
     */
    private async lineTags(p: FlowPhase): Promise<string[]> {
        const prefix = this.prefixOf(p)
        const raw = await this.git.raw([
            "for-each-ref", "--format=%(refname:short) %(objecttype)",
            "--sort=-v:refname", `--merged=${p.branch}`, `refs/tags/${prefix}*`,
        ]).catch(() => "")
        const out: string[] = []
        for (const row of String(raw).split("\n")) {
            const [name, type] = row.trim().split(/\s+/)
            if (!name || type !== "tag") continue
            out.push(name)
        }
        return out
    }

    /**
     * The version this phase would cut next.
     *
     * `at` overrides the ref the range ENDS at — the runner passes the merge
     * commit, because after a promotion the branch ref may not have moved yet
     * (a worktree merge lands on a detached HEAD).
     *
     * ── A PRERELEASE HAS TWO BASELINES, AND THEY ARE DIFFERENT QUESTIONS ──
     *
     * The CORE comes from the release line — the newest STABLE tag — because
     * `1.2.0-dev.3` is a preview of the 1.2.0 that is coming, and a preview whose
     * core is derived from another preview drifts away from the line it previews.
     * The COUNTER comes from the newest tag already in this channel AT THAT CORE.
     *
     * Conflating them is not theoretical: with one baseline this method answered
     * `v0.0.1-dev.1` on a repository whose release line was at v1.1.0 (no stable
     * tag matched the channel filter, so the base fell to 0.0.0), and the second
     * cut then recomputed the SAME string and died on an existing tag. Measured
     * 2026-08-06. The bump is applied to the stable core exactly once, and the
     * channel counter never bumps the core again.
     */
    async nextVersion(p: FlowPhase, at?: string): Promise<{ version: string; current: string; why?: string }> {
        const prefix = this.prefixOf(p)
        const tags = await this.lineTags(p)
        const core = (t: string) => t.slice(prefix.length)
        const stable = tags.find(t => !core(t).includes("-")) ?? ""
        const current = p.channel
            ? (tags.find(t => core(t).includes(`-${p.channel}.`)) ?? stable)
            : stable
        // The core is ALWAYS built from the stable line; see the note above.
        const base = stable ? core(stable) : "0.0.0"

        let bump: "major" | "minor" | "patch" | undefined =
            p.bump ?? this.config?.versioning?.defaultBump ?? "patch"
        let why: string | undefined

        if (p.derive !== false && stable) {
            // ── THE RANGE, AND WHY IT IS A UNION BEFORE THE MERGE ──
            //
            // After a promotion the target branch contains the source, so one
            // range `current..<merge commit>` is the whole story — that is the
            // `at` case, passed by the runner.
            //
            // BEFORE the merge it is not. `current..main` is EMPTY (main has not
            // moved yet), so a plan that used it derived nothing, fell to
            // defaultBump, and answered `v1.0.1` for a promotion the run then
            // correctly cut as `v1.1.0` — the plan and the act disagreeing about
            // the number, which is the one thing a plan may never do. Measured
            // 2026-08-06 on a two-commit fixture with a `feat:` in it.
            //
            // `current..main` alone is wrong and `current..dev` alone is too: the
            // target may carry commits since the tag that the source lacks (the
            // divergence the plan reports as `behind`). `git log A..B A..C` is the
            // UNION of both, which is exactly what the merge will produce, so the
            // plan grades the same set the run will.
            const ends = at ? [at] : (p.mergeFrom ? [p.branch, p.mergeFrom] : [p.branch])
            // From the STABLE tag, not from the channel's newest: a prerelease
            // counter moving does not mean the work was already graded.
            const ranges = ends.map(e => `${stable}..${e}`)
            const pathspecs = (p.paths ?? "").split(/\s+/).filter(Boolean)
            // --no-merges: a merge commit carries no type and never could — its
            // content is the commits it joins, and those are in this range too.
            const args = [
                ...ranges.slice(1),
                "--no-merges",
                ...(pathspecs.length ? ["--", ...pathspecs] : []),
            ]
            const commits = await this.logCommits([...ranges, ...args])
            if (commits?.length) {
                const evidence = deriveBump(commits, this.config)
                bump = evidence.bump
                why = explainBump(evidence)
            }
        }

        const nextCore = semver.inc(base, bump ?? "patch") ?? base
        if (!p.channel) {
            return { version: `${prefix}${nextCore}`, current: current || "none", why }
        }
        // The counter continues within THIS core. A new core restarts at 1, which
        // is what makes `1.2.0-dev.1` follow `1.1.0-dev.7` rather than `.8`.
        const inChannel = tags.filter(t => core(t).startsWith(`${nextCore}-${p.channel}.`))
        let n = 0
        for (const t of inChannel) {
            const m = core(t).match(new RegExp(`^${this.escapeRe(nextCore)}-${this.escapeRe(p.channel)}\\.(\\d+)$`))
            if (m) n = Math.max(n, parseInt(m[1], 10))
        }
        return { version: `${prefix}${nextCore}-${p.channel}.${n + 1}`, current: current || "none", why }
    }

    /**
     * Remove one worktree this tool created, and deregister it.
     *
     * `keep: true` leaves it for inspection — of the run that just happened. The
     * next run reclaims it (see reclaimWorktrees), because `keep` is a debugging
     * aid and not a licence to hoard checkouts.
     *
     * `worktree remove` can refuse (a lock, a file it cannot delete), and a
     * refusal that leaves the directory behind is exactly the accumulation this
     * guards against — so the removal falls back to deleting the directory, and
     * `prune` then clears the registration git is left holding.
     */
    private async removeWorktree(dir: string): Promise<void> {
        if (this.config?.flow?.worktree?.keep === true) return
        // SAFE to swallow: nothing reads this call's outcome. Whether it removed
        // the worktree is re-measured on the next line by LOOKING — existsSync —
        // so a wrapper that misreports the exit status changes nothing.
        await this.git.raw(["worktree", "remove", "--force", dir]).catch(() => {})
        if (existsSync(dir)) {
            try { rmSync(dir, { recursive: true, force: true }) } catch { /* reported by prune */ }
        }
        // SAFE to swallow: housekeeping with no answer. Nothing branches on
        // whether the registration was cleared, and a stale registration is
        // reclaimed by the next run.
        await this.git.raw(["worktree", "prune"]).catch(() => {})
    }

    /**
     * Reclaim leftovers before starting: this phase's directory and any other
     * `flow-*` under the configured root that carries OUR owner marker.
     *
     * A killed process (a laptop closing, a CI timeout, a SIGKILL) leaves a
     * worktree no finally ever runs for. Without this they pile up one full
     * checkout at a time, and the only symptom is a disk that fills.
     *
     * ⚠️ AN UNOWNED DIRECTORY IS REFUSED, NOT RECLAIMED — and the refusal comes
     * FIRST. A directory that merely looks like ours may hold somebody's
     * in-flight work; two sessions have already been lost to a tool removing
     * worktrees it did not create.
     */
    private async reclaimWorktrees(current: string): Promise<void> {
        if (existsSync(current) && !existsSync(join(current, ".grm-flow", "owner"))) {
            throw new Error(`${current} exists and carries no owner marker — refusing to reuse it.`)
        }
        const rootDir = join(current, "..")
        let entries: string[] = []
        try {
            entries = readdirSync(rootDir).filter(e => e.startsWith("flow-"))
        } catch {
            return                                   // the root does not exist yet
        }
        for (const e of entries) {
            const dir = join(rootDir, e)
            if (!existsSync(join(dir, ".grm-flow", "owner"))) continue   // not ours
            // SAFE to swallow, for the same reason as removeWorktree: the
            // outcome is re-measured by existsSync rather than inferred.
            await this.git.raw(["worktree", "remove", "--force", dir]).catch(() => {})
            if (existsSync(dir)) {
                try { rmSync(dir, { recursive: true, force: true }) } catch { /* prune reports */ }
            }
        }
        // SAFE to swallow: housekeeping with no answer. Nothing branches on
        // whether the registration was cleared, and a stale registration is
        // reclaimed by the next run.
        await this.git.raw(["worktree", "prune"]).catch(() => {})
    }

    /**
     * The commits in a range, read from THIS controller's repository.
     *
     * 🔴 NOT `getGitLogAsJson`. That helper constructs `simpleGit()` with no
     * working directory, so it reads whatever `process.cwd()` happens to be —
     * which is the repository under management only by coincidence. Measured
     * 2026-08-06: seven cases of this suite failed because the derivation was
     * grading the commits of the grm checkout the tests run from instead of the
     * fixture repository it was handed. The CLI never noticed, because there cwd
     * IS the repository. A class that takes a `root` has to honour it.
     */
    private async logCommits(args: string[]): Promise<GitCommit[]> {
        try {
            const log = await this.git.log(args)
            return log.all.map(c => ({
                hash: c.hash,
                shortHash: c.hash.substring(0, 7),
                message: c.message,
                body: c.body,
                authorName: c.author_name,
                authorEmail: c.author_email,
                date: c.date,
            }))
        } catch {
            // SAFE to swallow: `git log` answers with its OUTPUT, so this is not
            // the exit-code shape lineTags warns about. An empty range and a
            // failed one both produce no commits, and `nextVersion` then falls to
            // the configured defaultBump — a smaller bump than the history would
            // have justified, never a larger one.
            return []
        }
    }

    private escapeRe(s: string): string {
        return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    }

    /** What `run` would do. Reads only. */
    async plan(name: string): Promise<FlowPlan> {
        const p = this.phase(name)
        let ahead = 0, behind = 0
        if (p.mergeFrom) {
            ahead = await this.count(`${p.branch}..${p.mergeFrom}`)
            behind = await this.count(`${p.mergeFrom}..${p.branch}`)
        }
        const { version, current, why } = await this.nextVersion(p)
        return {
            phase: name,
            branch: p.branch,
            channel: p.channel,
            mergeFrom: p.mergeFrom,
            ahead, behind,
            current, next: version, bumpWhy: why,
            willTag: p.tag !== false,
            willDeleteSource: p.deleteSource === true,
            mergeStrategy: this.strategyOf(p),
            worktree: this.config?.flow?.worktree?.enabled ? this.worktreeDir(name) : undefined,
        }
    }

    private async count(range: string): Promise<number> {
        // SAFE to swallow: `rev-list --count` PRINTS its answer, so the number is
        // read out of stdout and not out of an exit status — see lineTags for
        // the shape that is not safe. Both failure directions land on 0: the
        // catch returns "0", and a wrapper that resolved an error with empty
        // output gives NaN, which the guard below also turns into 0. Zero is the
        // fail-CLOSED direction — `run` refuses a promotion it measures as
        // carrying nothing, so a broken measurement mints no version.
        const out = await this.git.raw(["rev-list", "--count", range]).catch(() => "0")
        const n = parseInt(String(out).trim(), 10)
        return Number.isFinite(n) ? n : 0
    }

    private worktreeDir(phase: string): string {
        const dir = this.config?.flow?.worktree?.dir ?? ".grm/worktrees"
        return resolve(this.root, dir, `flow-${phase}`.replace(/[^A-Za-z0-9_.-]/g, "-"))
    }

    /**
     * Execute the phase.
     *
     * Returns the plan it acted on, with `tagged` set when a tag was created.
     */
    async run(name: string): Promise<FlowPlan & { tagged?: string; mergeCommit?: string }> {
        const p = this.phase(name)
        const plan = await this.plan(name)

        if (p.mergeFrom && plan.ahead === 0) {
            throw new Error(
                `${p.mergeFrom} carries nothing that ${p.branch} does not already have. ` +
                `There is nothing to promote.`
            )
        }

        const useWorktree = this.config?.flow?.worktree?.enabled === true
        let workGit: SimpleGit = this.git
        // `createdDir` is set ONLY after `worktree add` returns, and the finally
        // removes nothing else.
        //
        // 🔴 A `wtDir` set before the refusal would be REMOVED BY THE FINALLY.
        // reclaimWorktrees throws on a directory that carries no owner marker —
        // the whole point being that it may hold somebody's in-flight work — and
        // with one variable for both roles the cleanup then deleted exactly the
        // directory the refusal had just protected. Caught before shipping, by
        // reading the throw path rather than by a test.
        let createdDir = ""
        let mergeCommit: string | undefined

        // 🔴 THE SETUP IS INSIDE THE TRY, so the finally reaches it.
        //
        // It used to sit above, and the window was real: `worktree add` succeeds,
        // the `checkout --detach` after it throws, and the finally never runs
        // because the try had not been entered — leaving a registered worktree on
        // disk that nothing would ever remove. Worktrees that accumulate are not a
        // tidiness problem; each one is a full checkout of the tree.
        try {
            if (useWorktree) {
                const wtDir = this.worktreeDir(name)
                await this.reclaimWorktrees(wtDir)
                mkdirSync(join(wtDir, ".."), { recursive: true })
                // DETACHED, because git refuses the same branch in two worktrees
                // and the phase's branch is very often checked out where you are
                // standing. The branch ref is moved explicitly below.
                await this.git.raw(["worktree", "add", "--detach", wtDir, p.branch])
                createdDir = wtDir
                mkdirSync(join(wtDir, ".grm-flow"), { recursive: true })
                writeFileSync(join(wtDir, ".grm-flow", "owner"), OWNER_TOKEN + "\n")
                workGit = simpleGit(wtDir)
            }
            if (p.mergeFrom) {
                const args = ["merge", "--no-edit", p.mergeFrom]
                // See FlowPhase.merge: `ff` has to be asked for in writing.
                if (this.strategyOf(p) === "no-ff") args.splice(1, 0, "--no-ff")
                await workGit.raw(args)
                mergeCommit = (await workGit.revparse(["HEAD"])).trim()

                if (useWorktree) {
                    // The worktree is DETACHED, so the merge did not move the
                    // branch. `update-ref` with the OLD value as the expected
                    // one, so a peer that advanced the branch in the meantime
                    // makes this fail rather than silently discarding their work.
                    const before = await this.git.revparse([p.branch])
                    await this.git.raw([
                        "update-ref", "-m", `grm flow ${name}: promote ${p.mergeFrom}`,
                        `refs/heads/${p.branch}`, mergeCommit, before.trim(),
                    ])
                }
            }

            // AFTER the merge — see the header. The range now contains the work.
            const { version, current, why } = await this.nextVersion(
                p, mergeCommit ?? p.branch
            )
            plan.next = version
            plan.current = current
            plan.bumpWhy = why

            if (p.tag !== false) {
                await workGit.raw([
                    "tag", "-a", version, "-m", `${version}\n\ngrm flow ${name}`,
                    ...(mergeCommit ? [mergeCommit] : []),
                ])
            }

            if (p.deleteSource === true && p.mergeFrom) {
                await this.git.raw(["branch", "-d", p.mergeFrom])
            }
        } finally {
            if (createdDir) await this.removeWorktree(createdDir)
        }

        return { ...plan, tagged: p.tag !== false ? plan.next : undefined, mergeCommit }
    }
}
