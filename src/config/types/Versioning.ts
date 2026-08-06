/**
 * Version-derivation and version-stamping policy.
 *
 * Both halves are OPT-IN and both default to doing nothing, for the same
 * reason: an existing config written before either feature existed must keep
 * behaving exactly as it did. A default that silently starts writing files or
 * grading commits differently would change every project's output on upgrade.
 */
export interface StampFile {
    /**
     * Repo-relative path. A single `*` in the FINAL segment expands against a
     * flat listing of that directory (the rule ProjectVersion's matcher
     * enforces); anything a real glob would be needed for throws by name rather
     * than quietly matching nothing.
     */
    path: string
    /** A JavaScript regular expression, as a string. */
    pattern: string
    /**
     * The replacement. `{version}` is the version as given; `{versionCore}` is
     * it with any leading non-digit prefix removed, for fields that must parse
     * as bare semver.
     */
    replace: string
    /** Regex flags. Default `m` — `^`/`$` anchor per line, which is the common shape. */
    flags?: string
    /**
     * Refuse rather than skip when this path is absent, or when the pattern
     * matches nothing in it. Default false: a project with optional components
     * should not fail a release because one of them is not checked out.
     */
    required?: boolean
}

export interface Versioning {
    /** The level a range falls to when no commit votes. Default: patch. */
    defaultBump?: 'major' | 'minor' | 'patch'
    /** Write the version into the working tree. Absent = write nothing. */
    stamp?: {
        files?: StampFile[]
        /** Stamp automatically after a successful bump. Default false. */
        onBump?: boolean
        /**
         * Commit what was stamped. The add is a PATHSPEC over exactly those
         * files — on a shared checkout a broad add carries a peer's staged work
         * into your commit.
         */
        commit?: {
            enabled?: boolean
            /** `{version}` / `{versionCore}` allowed. */
            message?: string
        }
    }
}
