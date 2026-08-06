import { Config } from '../../config/types/Config'
import { GitCommit } from '../git/types/GitCommit'

/**
 * BumpDeriver — decide major/minor/patch from the commits in a range.
 *
 * ── WHY THE TAXONOMY IS THE INPUT, AND NOT A SECOND TABLE ──
 *
 * A project that has already told this tool what `feat` and `BREAKING CHANGE`
 * mean — in `commitTypes` and `noteTypes`, which drive the changelog — has
 * already described its vocabulary. Asking it to describe the same vocabulary
 * again in a `bumpRules` block would create two tables that must agree, and
 * they would disagree exactly where it is hardest to see: the changelog would
 * group a commit one way while the version arithmetic graded it another.
 *
 * So the bump lives ON the existing type definitions:
 *
 *   "commitTypes": [{ "type": "feature", "terms": ["feat"], "bump": "minor" }]
 *   "noteTypes":   [{ "type": "breaking-change", "sign": "!",
 *                     "terms": ["BREAKING CHANGE"], "bump": "major" }]
 *
 * A type with no `bump` contributes nothing; the range then falls to
 * `versioning.defaultBump` (patch unless configured otherwise). That is what
 * makes the feature opt-in: an existing config derives `patch` for everything
 * until somebody says which types mean more than that.
 *
 * ── WHAT IT REFUSES TO GUESS ──
 *
 * A commit that matches no configured type is NOT evidence of anything. It is
 * counted as `unmatched` and reported, because "38 of 641 commits were not
 * classified" is a fact the caller may want to act on — and silently treating
 * them as patch would make a range of pure unclassified work look deliberate.
 * The default still applies; the count says how much of it was a default rather
 * than a decision.
 */

export type BumpType = 'major' | 'minor' | 'patch'

const RANK: Record<BumpType, number> = { patch: 1, minor: 2, major: 3 }

export interface BumpEvidence {
    /** The winning bump. */
    bump: BumpType
    /** How many commits voted for each level. */
    counts: Record<BumpType, number>
    /** Commits matching no configured commit type. */
    unmatched: number
    /** Total commits considered. */
    total: number
    /** Whether anything at all voted — false means `bump` is the default. */
    derived: boolean
    /** Human-readable reasons, highest first. */
    reasons: string[]
}

/**
 * The conventional-commit subject shape, with the modifier group that carries
 * the `!` marker. Identical to the one enrichCommit uses, deliberately: the
 * changelog and the version must agree on what a commit IS before they can
 * disagree about what it means.
 */
const SUBJECT = /^(?<type>\w+)(\((?<scope>[^)]+)\))?(?<modifier>[!+~?*])?:\s(?<summary>.+)$/

function isBump(v: unknown): v is BumpType {
    return v === 'major' || v === 'minor' || v === 'patch'
}

/**
 * deriveBump — grade a set of commits against the configured taxonomy.
 *
 * Pure: it takes the commits, never reads git. That is what lets the caller
 * decide the range (and lets a test supply a fixture without a repository).
 */
export function deriveBump(commits: GitCommit[], config: Config): BumpEvidence {
    const fallback: BumpType = isBump((config as any)?.versioning?.defaultBump)
        ? (config as any).versioning.defaultBump
        : 'patch'

    const counts: Record<BumpType, number> = { major: 0, minor: 0, patch: 0 }
    const reasons: string[] = []
    let unmatched = 0
    let best: BumpType | null = null

    const noteTypes = config?.noteTypes ?? []
    const commitTypes = config?.commitTypes ?? []

    const vote = (level: BumpType, why: string) => {
        counts[level]++
        if (best === null || RANK[level] > RANK[best]) {
            best = level
        }
        if (reasons.length < 20) reasons.push(`${level}: ${why}`)
    }

    for (const commit of commits) {
        const subject = (commit.message ?? '').trim()
        const body = commit.body ?? ''
        const m = SUBJECT.exec(subject)
        const term = m?.groups?.type ?? null
        const modifier = m?.groups?.modifier ?? null

        let voted = false

        // ── notes first: a breaking change outranks whatever the type says ──
        //
        // TWO SPELLINGS, BOTH FROM THE SAME DEFINITION. `feat!: x` carries the
        // note's `sign` in the subject; `BREAKING CHANGE: …` carries one of its
        // `terms` in the body. Conventional commits treats them as equivalent
        // and so does this — reading both off ONE noteType entry is what keeps
        // them equivalent when somebody edits the config.
        for (const note of noteTypes) {
            const level = (note as any).bump
            if (!isBump(level)) continue

            if (note.sign && modifier && note.sign === modifier) {
                vote(level, `${subject.slice(0, 60)} (subject sign '${note.sign}')`)
                voted = true
                break
            }
            const hit = (note.terms ?? []).find(t =>
                new RegExp(`(^|\\n)\\s*${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`, 'i').test(body)
            )
            if (hit) {
                vote(level, `${subject.slice(0, 60)} (body '${hit}')`)
                voted = true
                break
            }
        }
        if (voted) continue

        // ── then the commit type ──
        if (term) {
            const matched = commitTypes.find(ct => (ct.terms ?? []).includes(term))
            if (matched) {
                const level = (matched as any).bump
                if (isBump(level)) {
                    vote(level, `${subject.slice(0, 60)} (${matched.type})`)
                    voted = true
                }
                continue
            }
        }

        // A commit the taxonomy does not describe. Counted, never guessed at.
        if (!voted) unmatched++
    }

    return {
        bump: best ?? fallback,
        counts,
        unmatched,
        total: commits.length,
        derived: best !== null,
        reasons,
    }
}

/**
 * explainBump — the one-paragraph account, for a caller that wants to show its
 * operator WHY before writing a tag.
 *
 * Goes to the caller, not to stdout: `version` prints the version string on
 * stdout and consumers read the last line of it. An explanation printed there
 * would be read as a version by every one of them.
 */
export function explainBump(e: BumpEvidence): string {
    const parts = [
        `${e.counts.major} major`,
        `${e.counts.minor} minor`,
        `${e.counts.patch} patch`,
    ]
    if (e.unmatched > 0) parts.push(`${e.unmatched} unclassified`)
    const head = e.derived
        ? `derived ${e.bump} from ${e.total} commit(s)`
        : `no commit voted; falling back to ${e.bump} (${e.total} commit(s) seen)`
    return `${head} — ${parts.join(' · ')}`
}
