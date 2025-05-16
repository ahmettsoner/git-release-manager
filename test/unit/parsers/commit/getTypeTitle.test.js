const { getTypeTitle } = require('../../../src/parsers/commit')

describe('getTypeTitle', () => {
    const mockCommitTypes = [
        { type: 'feat', title: 'Features', terms: ['feat'] },
        { type: 'fix', title: 'Bug Fixes', terms: ['fix', 'bugfix'] },
        { type: 'docs', title: 'Documentation', terms: ['docs', 'doc'] },
    ]

    it('should return correct title for matching type', () => {
         & Assert
        expect(getTypeTitle(mockCommitTypes, 'feat')).toBe('Features')
        expect(getTypeTitle(mockCommitTypes, 'fix')).toBe('Bug Fixes')
        expect(getTypeTitle(mockCommitTypes, 'bugfix')).toBe('Bug Fixes')
    })

    it('should return "Other Changes" for non-matching type', () => {
         & Assert
        expect(getTypeTitle(mockCommitTypes, 'unknown')).toBe('Other Changes')
        expect(getTypeTitle(mockCommitTypes, '')).toBe('Other Changes')
        expect(getTypeTitle(mockCommitTypes, null)).toBe('Other Changes')
    })

    it('should handle case-sensitive matches', () => {
         & Assert
        expect(getTypeTitle(mockCommitTypes, 'FEAT')).toBe('Other Changes')
        expect(getTypeTitle(mockCommitTypes, 'Docs')).toBe('Other Changes')
    })
})
