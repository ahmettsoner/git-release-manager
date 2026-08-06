export interface NoteType {
    sign: string
    type: string
    terms: string[]
    title: string
    order?: number
    /** Which semver level this note forces. Outranks the commit type. */
    bump?: 'major' | 'minor' | 'patch'
}
