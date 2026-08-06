/**
 * The release FLOW: which phases a project has, which branch each one cuts on,
 * and how the branches move between them.
 *
 * ── WHY THIS IS A NEW DECLARATION AND NOT `branchStrategies` ──
 *
 * `branchStrategies` already describes a flow, and it describes a DIFFERENT one:
 * git-flow. A branch's type comes from the first segment of its NAME
 * (`release/1.4.0` → `release`), `grm branch finish` merges it into every
 * `baseBranches` entry, and — the part that matters — `createTag` takes the
 * version from the branch name (`activeBranch.replace('release/','')`). That
 * model works, and it cannot express a project whose integration line IS a
 * long-lived branch: there is no `release/*` branch to name, so there is no
 * name to read a version out of, and the bump derivation (commitTypes /
 * noteTypes) is bypassed entirely.
 *
 * ── WHY NOT FlowManager's `phases` EITHER ──
 *
 * FlowManager carries its own private `phases` type with hardcoded channels
 * (dev/alpha/beta/stabil) and a `releasePrefix: 'release/'` assumption, and
 * every one of its call sites constructs it with NO config — so a project
 * cannot reach it. Measured 2026-08-06 against a repository whose release line
 * was at v1.3.0: `flow phase dev --next` answered `v1.0.0-dev.1` (it could not
 * see the tags, so it fell back to its default base version), `flow phase prod
 * --next` errored on a `release/1.0.0` branch that does not exist, and
 * `flow phase qa dev` threw on `startBuildNumber` because `dev` is not among
 * its hardcoded qa channels and no config can add it.
 *
 * So this type is what a project DECLARES, and the version always comes from
 * the commit range — never from a branch name.
 */

export interface FlowPhase {
    /** The branch this phase's version is cut ON. */
    branch: string

    /**
     * Prerelease channel, e.g. `dev` → `1.4.0-dev.3`. Omitted means a stable
     * version. This is the phase's own vocabulary, not a global one: two phases
     * may cut on the same branch with different channels.
     */
    channel?: string

    /**
     * The branch whose work this phase promotes INTO `branch`. Omitted means the
     * phase only cuts a version and moves nothing — which is what a pure
     * integration phase does.
     */
    mergeFrom?: string

    /**
     * `no-ff` (the default) or `ff`.
     *
     * 🔴 THE DEFAULT IS NOT A STYLE CHOICE. A fast-forward moves the ref and
     * creates no commit, so a `pre-merge-commit` hook never runs — every gate a
     * project hangs on its promotion silently does not execute, while each step
     * reports success. `ff` is offered because a project may genuinely want it;
     * it is never what you get by accident.
     */
    merge?: "no-ff" | "ff"

    /** Create an annotated tag for the computed version. Default true. */
    tag?: boolean

    /**
     * Derive the bump from the commits in the range, via the `bump` fields on
     * commitTypes / noteTypes. Default true — the whole point of this
     * declaration is that the number comes from the history.
     */
    derive?: boolean

    /** The level a range falls to when no commit votes. Default: versioning.defaultBump. */
    bump?: "major" | "minor" | "patch"

    /**
     * Delete `mergeFrom` after a successful promotion. Default FALSE, and the
     * default is the point: on a long-lived integration line the source branch
     * is where everybody works, and deleting it is not a cleanup but an outage.
     * A project with short-lived release branches sets it to true.
     */
    deleteSource?: boolean

    /**
     * Tag prefix for THIS phase's line, e.g. `catalystctl-v`. Defaults to
     * `tag.prefix`. A prefix names the LINE, not the version.
     */
    prefix?: string

    /** Pathspecs the derivation is scoped to — one component's tree. */
    paths?: string

    /**
     * Branches this phase's target is merged BACK into once the version is cut.
     *
     * 🔴 WITHOUT THIS A PROMOTION IS A ONE-WAY TRIP, and the next one is not an
     * integration. The promotion creates a merge commit ON the target, and that
     * commit exists nowhere else — so `main..dev` is never empty again, the
     * source and the target have DIVERGED by construction, and a rule that says
     * "the release branch advances only by a dev→main merge" cannot hold. Measured
     * on this repository: main carried exactly one commit dev did not have, its
     * own previous promotion's merge, and a readiness gate had been red on it
     * since.
     *
     * It also decides what `git describe` answers on the integration line: until
     * the merge returns, dev cannot see the tag that was just cut and keeps
     * describing the one before it.
     *
     * Runs AFTER the tag, so the branches that receive it also receive the tag.
     */
    backMerge?: string[]
}

/**
 * A declared merge ROUTE that is not a phase: the hotfix and bugfix shapes, where
 * work starts on a branch other than the integration line and has to reach the
 * others.
 *
 * A phase answers "cut a version here". A route answers "carry this content
 * there", with no version involved — which is why it is a separate declaration
 * rather than a phase with `tag: false`. A hotfix landing on the release line is
 * a promotion (it earns a version); the same hotfix reaching the integration line
 * is a route (it must not).
 */
export interface FlowRoute {
    /** The branch whose content is carried. */
    from: string
    /** Every branch it is merged into, in order. */
    into: string[]
    /** `no-ff` (default) or `ff`. See FlowPhase.merge for why. */
    merge?: "no-ff" | "ff"
    /**
     * `down` = toward the less stable lines (a hotfix on main reaching dev).
     * `up`   = toward the more stable ones (a bugfix on a topic branch reaching
     *          the integration line).
     *
     * DECLARED SO IT CAN BE CHECKED. With `lines` set, a route whose direction
     * contradicts the ladder is REFUSED — a hotfix route accidentally pointing up
     * would merge the whole integration line into the release line, which is a
     * release nobody planned and which every gate would report as success.
     */
    direction?: "up" | "down"
}

export interface FlowWorktree {
    /**
     * Perform the merge and the tag in a private detached worktree instead of
     * the checkout you are standing in. Default FALSE, so nothing changes for a
     * project that has not asked.
     *
     * WHY IT EXISTS. A promotion in the current checkout has to `git checkout`
     * the target branch, which fails on a dirty tree and, on a SHARED checkout,
     * is actively unsafe: the index is one file that every process on the box
     * writes, so another session's `git add` lands in your commit and its
     * `git reset` unstages yours. A linked worktree has its own index and its
     * own HEAD, so a promotion becomes invisible to every other session.
     */
    enabled?: boolean
    /** Where to put it, relative to the repository root. Default `.grm/worktrees`. */
    dir?: string
    /** Leave it behind for inspection instead of removing it. Default false. */
    keep?: boolean
}

export interface Flow {
    worktree?: FlowWorktree
    /** Phase name → its declaration. The names are the project's own. */
    phases: Record<string, FlowPhase>
    /**
     * The stability ladder, MOST STABLE FIRST — e.g. `["main", "dev"]`.
     *
     * Its only job is to make `direction` checkable. Without it a route's
     * direction is a comment; with it, "down" and "up" are claims this tool can
     * refuse. Omitted = no direction checking.
     */
    lines?: string[]
    /** Route name → its declaration. See FlowRoute. */
    routes?: Record<string, FlowRoute>
}
