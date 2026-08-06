import { existsSync, mkdirSync, writeFileSync } from 'fs'
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
     * Three filters, and each one is load-bearing. ANNOTATED only: a lightweight
     * tag carries no tagger, so it records nothing about who cut it. REACHABLE
     * from the branch: a tag on a side branch names code this line never
     * carried. Sorted by VERSION, not lexically — `-v:refname`, because a
     * lexical sort puts v1.10.0 below v1.9.0 and the baseline would walk
     * backwards on the tenth minor.
     */
    async currentVersion(p: FlowPhase): Promise<string> {
        const prefix = this.prefixOf(p)
        const raw = await this.git.raw([
            "for-each-ref", "--format=%(refname:short) %(objecttype)",
            "--sort=-v:refname", `refs/tags/${prefix}*`,
        ]).catch(() => "")
        for (const row of String(raw).split("\n")) {
            const [name, type] = row.trim().split(/\s+/)
            if (!name || type !== "tag") continue
            const core = name.slice(prefix.length)
            // A phase with a channel wants that channel's newest tag; a stable
            // phase must not adopt a prerelease as its baseline, or every stable
            // cut would inherit `-dev.N` and never leave it.
            const isPre = core.includes("-")
            if (p.channel) {
                if (!core.includes(`-${p.channel}.`)) continue
            } else if (isPre) {
                continue
            }
            const reachable = await this.git
                .raw(["merge-base", "--is-ancestor", `${name}^{commit}`, p.branch])
                .then(() => true)
                .catch(() => false)
            if (reachable) return name
        }
        return ""
    }

    /**
     * Every annotated tag on this line, newest-version first, reachable from the
     * phase's branch. One walk; the two baseline questions below filter it.
     */
    private async lineTags(p: FlowPhase): Promise<string[]> {
        const prefix = this.prefixOf(p)
        const raw = await this.git.raw([
            "for-each-ref", "--format=%(refname:short) %(objecttype)",
            "--sort=-v:refname", `refs/tags/${prefix}*`,
        ]).catch(() => "")
        const out: string[] = []
        for (const row of String(raw).split("\n")) {
            const [name, type] = row.trim().split(/\s+/)
            if (!name || type !== "tag") continue
            const reachable = await this.git
                .raw(["merge-base", "--is-ancestor", `${name}^{commit}`, p.branch])
                .then(() => true)
                .catch(() => false)
            if (reachable) out.push(name)
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
        let wtDir = ""

        if (useWorktree) {
            wtDir = this.worktreeDir(name)
            mkdirSync(join(wtDir, ".."), { recursive: true })
            if (!existsSync(wtDir)) {
                // DETACHED, because git refuses the same branch in two worktrees
                // and the phase's branch is very often checked out where you are
                // standing. The branch ref is moved explicitly below.
                await this.git.raw(["worktree", "add", "--detach", wtDir, p.branch])
                mkdirSync(join(wtDir, ".grm-flow"), { recursive: true })
                writeFileSync(join(wtDir, ".grm-flow", "owner"), "FlowController/v1\n")
            } else if (!existsSync(join(wtDir, ".grm-flow", "owner"))) {
                // Only ever touch what this tool created. A directory that merely
                // looks like ours may hold somebody's in-flight work.
                throw new Error(`${wtDir} exists and carries no owner marker — refusing to reuse it.`)
            } else {
                await simpleGit(wtDir).raw(["checkout", "--detach", p.branch])
            }
            workGit = simpleGit(wtDir)
        }

        let mergeCommit: string | undefined
        try {
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
            if (useWorktree && wtDir && this.config?.flow?.worktree?.keep !== true) {
                await this.git.raw(["worktree", "remove", "--force", wtDir]).catch(() => {})
                await this.git.raw(["worktree", "prune"]).catch(() => {})
            }
        }

        return { ...plan, tagged: p.tag !== false ? plan.next : undefined, mergeCommit }
    }
}
