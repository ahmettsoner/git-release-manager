import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import semver from 'semver'
import simpleGit, { SimpleGit } from 'simple-git'

import { Config } from '../../config/types/Config'
import { FlowPhase, FlowRoute } from '../../config/types/Flow'
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
    /** Branches the target is merged back into; empty means a one-way promotion. */
    backMerge?: string[]
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

    /**
     * The phase's branch must EXIST before any question about it means anything.
     *
     * 🔴 WITHOUT THIS A MISSING BRANCH ANSWERS A VERSION. Every tag walk filters
     * on `merge-base --is-ancestor <tag> <branch>`, which simply fails for a
     * branch that is not there — so no tag is reachable, the baseline falls to
     * 0.0.0, and the phase confidently reports `v0.0.1` for a line it cannot see.
     * Measured 2026-08-06 in a `git clone --branch dev` of a repository at v1.3.0:
     * `main` existed only as a remote-tracking ref, and `flow next prod` answered
     * v0.0.1 while the sibling driver answered v1.0.0. A number that names nothing
     * is worse than a refusal, because a caller substitutes it into a tag.
     */
    private async assertBranch(branch: string, role: string): Promise<void> {
        const ok = await this.git
            .raw(["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`])
            .then(out => String(out).trim() !== "")
            .catch(() => false)
        if (!ok) {
            throw new Error(
                `${role} '${branch}' does not exist in this repository ` +
                `(a remote-tracking ref is not enough — create the local branch).`
            )
        }
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
        await this.assertBranch(p.branch, "the phase's branch")
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
     * aid and not a licence to hoard checkouts. With back-merges or routes in the
     * same run, that means the LAST merge's worktree is the one left standing:
     * each merge reclaims the leftovers it finds before starting. Bounded on
     * purpose — the alternative is one full checkout per branch, kept forever.
     *
     * `worktree remove` can refuse (a lock, a file it cannot delete), and a
     * refusal that leaves the directory behind is exactly the accumulation this
     * guards against — so the removal falls back to deleting the directory, and
     * `prune` then clears the registration git is left holding.
     */
    private async removeWorktree(dir: string): Promise<void> {
        if (this.config?.flow?.worktree?.keep === true) return
        await this.git.raw(["worktree", "remove", "--force", dir]).catch(() => {})
        if (existsSync(dir)) {
            try { rmSync(dir, { recursive: true, force: true }) } catch { /* reported by prune */ }
        }
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
            await this.git.raw(["worktree", "remove", "--force", dir]).catch(() => {})
            if (existsSync(dir)) {
                try { rmSync(dir, { recursive: true, force: true }) } catch { /* prune reports */ }
            }
        }
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
            backMerge: p.backMerge ?? [],
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
     * mergeInto — carry `source` into `target`, and move `target`'s ref.
     *
     * THE ONE MECHANISM. A promotion, a back-merge and a route are the same act
     * with different names, and writing them three times is how they drift: the
     * promotion would keep its worktree isolation and its expected-value
     * update-ref while a back-merge quietly did a `checkout` in the shared tree.
     * Every caller gets both properties or neither.
     *
     * Returns the merge commit, or "" when there was nothing to merge — the
     * callers treat "nothing to do" differently, so this does not decide it.
     */
    private async mergeInto(
        target: string, source: string, strategy: "no-ff" | "ff", label: string
    ): Promise<string> {
        // Both ends must exist. `rev-list --count a..b` FAILS for a missing ref and
        // count() maps a failure to 0, which reads as "nothing to merge" — so a
        // route pointing at a branch that is not there would be reported as
        // skipped-because-already-current.
        await this.assertBranch(target, "the merge target")
        await this.assertBranch(source, "the merge source")
        const ahead = await this.count(`${target}..${source}`)
        if (ahead === 0) return ""

        // ── WHO HOLDS THE TARGET DECIDES WHERE THE MERGE HAPPENS ──
        //
        // 🔴 `update-ref` ON A CHECKED-OUT BRANCH DESYNCS THAT CHECKOUT. The ref
        // moves, HEAD follows it, and the working tree and index do NOT — so every
        // file that differs between the old and new commit shows up as a local
        // modification or deletion in a checkout the operator was not even looking
        // at. The promotion path never hit this because its target (the release
        // line) is not the branch anyone stands on; a BACK-MERGE targets the
        // integration line, which is exactly the branch everyone stands on.
        //
        // So: held HERE → merge in place, which is the only way that working tree
        // stays consistent (git updates it as part of the merge). Held in ANOTHER
        // worktree → refuse by name; moving somebody else's checked-out branch is
        // not ours to do.
        const holder = await this.worktreeHolding(target)
        const heldHere = holder !== "" && resolve(holder) === resolve(this.root)
        if (holder && !heldHere) {
            throw new Error(
                `${target} is checked out in another worktree (${holder}), so its ref cannot be ` +
                `moved from here without desyncing that checkout. Run the merge there, or detach it.`
            )
        }
        const useWorktree = this.config?.flow?.worktree?.enabled === true && !heldHere
        let workGit: SimpleGit = this.git
        let createdDir = ""
        // The branch to return to when this merge did not happen in a worktree.
        let restoreTo = ""
        try {
            if (!useWorktree) {
                // ── WITHOUT A WORKTREE THE TARGET HAS TO BE CHECKED OUT ──
                //
                // `git merge <source>` merges into HEAD, so merging into a branch
                // you are not standing on is not a merge at all: with HEAD on main
                // and the target dev, `merge main` answers "Already up to date",
                // dev's ref never moves, and the caller is told it succeeded.
                // Measured 2026-08-06 — five cases of the back-merge and route
                // suites failed exactly here, and the promotion path had hidden it
                // because its target was always the branch you were on.
                const head = (await this.git.raw(["rev-parse", "--abbrev-ref", "HEAD"])).trim()
                if (head !== target) {
                    // A checkout across a dirty tree either refuses or carries the
                    // changes onto the other branch. Neither belongs in a
                    // promotion, so it is refused by name — and this is the reason
                    // `worktree.enabled` exists.
                    const dirty = (await this.git.raw(["status", "--porcelain", "--untracked-files=no"])).trim()
                    if (dirty) {
                        throw new Error(
                            `${target} is not checked out and the tree is not clean, so it cannot be ` +
                            `checked out to merge ${source} into it. Enable flow.worktree, or clean the tree.`
                        )
                    }
                    await this.git.raw(["checkout", target])
                    restoreTo = head
                }
            }
            if (useWorktree) {
                const wtDir = this.worktreeDir(label)
                await this.reclaimWorktrees(wtDir)
                mkdirSync(join(wtDir, ".."), { recursive: true })
                // DETACHED, because git refuses the same branch in two worktrees
                // and the target is very often checked out where you are standing.
                await this.git.raw(["worktree", "add", "--detach", wtDir, target])
                createdDir = wtDir
                mkdirSync(join(wtDir, ".grm-flow"), { recursive: true })
                writeFileSync(join(wtDir, ".grm-flow", "owner"), OWNER_TOKEN + "\n")
                workGit = simpleGit(wtDir)
            }
            const args = ["merge", "--no-edit", source]
            // See FlowPhase.merge: `ff` has to be asked for in writing.
            if (strategy === "no-ff") args.splice(1, 0, "--no-ff")
            await workGit.raw(args)
            const head = (await workGit.revparse(["HEAD"])).trim()

            if (useWorktree) {
                // The worktree is DETACHED, so the merge did not move the branch.
                // `update-ref` with the OLD value as the expected one, so a peer
                // that advanced it in the meantime makes this FAIL rather than
                // silently discarding their work.
                const before = (await this.git.revparse([target])).trim()
                await this.git.raw([
                    "update-ref", "-m", `grm flow ${label}: merge ${source}`,
                    `refs/heads/${target}`, head, before,
                ])
            }
            return head
        } finally {
            if (createdDir) await this.removeWorktree(createdDir)
            // Put the operator back where they were, even on the throw path: a
            // failed promotion that also leaves you on another branch turns one
            // problem into two.
            if (restoreTo) await this.git.raw(["checkout", restoreTo]).catch(() => {})
        }
    }

    /** The route declaration, or a refusal that names what IS declared. */
    route(name: string): FlowRoute {
        const routes = this.config?.flow?.routes
        if (!routes || !routes[name]) {
            throw new Error(
                `Unknown route '${name}'. Declared: ${routes && Object.keys(routes).length ? Object.keys(routes).join(", ") : "(none)"}`
            )
        }
        const r = routes[name]
        if (!r.from || !r.into?.length) {
            throw new Error(`Route '${name}' needs both 'from' and a non-empty 'into'.`)
        }
        this.checkDirection(name, r)
        return r
    }

    /** What `syncRoute` would carry, per target. Reads only. */
    async planRoute(name: string): Promise<{ route: string; ahead: Record<string, number> }> {
        const r = this.route(name)
        const ahead: Record<string, number> = {}
        for (const t of r.into) ahead[t] = await this.count(`${t}..${r.from}`)
        return { route: name, ahead }
    }

    /**
     * The worktree path that has `branch` checked out, or "" if none does.
     *
     * `git worktree list --porcelain` is the only surface that answers this for
     * EVERY checkout including the main one; `rev-parse --abbrev-ref HEAD` only
     * ever answers about the directory you asked in, so a branch held by a
     * sibling worktree would read as free.
     */
    private async worktreeHolding(branch: string): Promise<string> {
        const out = await this.git.raw(["worktree", "list", "--porcelain"]).catch(() => "")
        let path = ""
        for (const line of String(out).split("\n")) {
            if (line.startsWith("worktree ")) path = line.slice("worktree ".length).trim()
            else if (line.startsWith("branch ")) {
                const ref = line.slice("branch ".length).trim()
                if (ref === `refs/heads/${branch}`) return path
            }
        }
        return ""
    }

    /**
     * Run a declared route: carry one branch's content to the others, with no
     * version involved. This is the hotfix/bugfix shape.
     *
     * The DIRECTION is checked against `flow.lines` when both are declared. A
     * hotfix route that says `down` but points up would merge the whole
     * integration line into the release line — a release nobody planned, which
     * every step would report as success.
     */
    async syncRoute(name: string): Promise<{ route: string; merged: Record<string, string>; skipped: string[] }> {
        const r: FlowRoute = this.route(name)
        const merged: Record<string, string> = {}
        const skipped: string[] = []
        for (const target of r.into) {
            const head = await this.mergeInto(
                target, r.from, r.merge === "ff" ? "ff" : "no-ff", `route-${name}-${target}`
            )
            if (head) merged[target] = head
            else skipped.push(target)
        }
        return { route: name, merged, skipped }
    }

    /**
     * The declared direction has to match the ladder. A branch not on the ladder
     * is not an error — topic branches are not lines — so it is simply not checked.
     */
    private checkDirection(name: string, r: FlowRoute): void {
        const lines = this.config?.flow?.lines
        if (!lines?.length || !r.direction) return
        const from = lines.indexOf(r.from)
        if (from === -1) return
        for (const target of r.into) {
            const to = lines.indexOf(target)
            if (to === -1) continue
            const actual = to > from ? "down" : to < from ? "up" : "same"
            if (actual !== r.direction) {
                throw new Error(
                    `Route '${name}' declares direction '${r.direction}' but ${r.from} -> ${target} ` +
                    `is '${actual}' on the declared ladder [${lines.join(" > ")}].`
                )
            }
        }
    }

    /**
     * Execute the phase.
     *
     * Returns the plan it acted on, with `tagged` set when a tag was created.
     */
    async run(name: string): Promise<FlowPlan & {
        tagged?: string; mergeCommit?: string; backMerged?: Record<string, string>
    }> {
        const p = this.phase(name)
        const plan = await this.plan(name)

        if (p.mergeFrom && plan.ahead === 0) {
            throw new Error(
                `${p.mergeFrom} carries nothing that ${p.branch} does not already have. ` +
                `There is nothing to promote.`
            )
        }
        const mergeCommit = p.mergeFrom
            // The label IS the phase name, so the directory `plan` reports
            // (`flow-<phase>`) is the directory `run` creates. A prettier label
            // here made the plan advertise a path nothing ever used.
            ? await this.mergeInto(p.branch, p.mergeFrom, this.strategyOf(p), name)
            : ""

        // AFTER the merge — see the header. The range now contains the work.
        const { version, current, why } = await this.nextVersion(p, mergeCommit || p.branch)
        plan.next = version
        plan.current = current
        plan.bumpWhy = why

        // The tag is created from the MAIN repository, not from the worktree that
        // performed the merge: the merge commit is in the object database and the
        // branch already points at it, so the worktree has no part left to play —
        // and it has been removed by now. Naming the commit explicitly, because
        // HEAD here is whatever the operator has checked out.
        if (p.tag !== false) {
            await this.git.raw([
                "tag", "-a", version, "-m", `${version}\n\ngrm flow ${name}`,
                ...(mergeCommit ? [mergeCommit] : [p.branch]),
            ])
        }

        // ── BACK-MERGE, AFTER THE TAG ──
        //
        // After the tag, so every branch that receives the merge also receives the
        // tag and can describe it. Before deleteSource, because a source that is
        // about to be deleted may itself be one of the branches that needs it.
        const backMerged: Record<string, string> = {}
        for (const target of p.backMerge ?? []) {
            if (target === p.branch) continue          // merging a branch into itself
            const head = await this.mergeInto(
                target, p.branch, this.strategyOf(p), `back-${name}-${target}`
            )
            if (head) backMerged[target] = head
        }

        if (p.deleteSource === true && p.mergeFrom) {
            await this.git.raw(["branch", "-d", p.mergeFrom])
        }

        return {
            ...plan,
            tagged: p.tag !== false ? plan.next : undefined,
            mergeCommit: mergeCommit || undefined,
            backMerged: Object.keys(backMerged).length ? backMerged : undefined,
        }
    }
}
