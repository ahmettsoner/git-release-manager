const { resolveType } = require('../../../src/git/resolveType')
const { isGitCommit, isGitRef, isGitTag, isGitBranch } = require('../../../src/git/validation')

jest.mock('../../../src/git/validation', () => ({
    isGitCommit: jest.fn(),
    isGitRef: jest.fn(),
    isGitTag: jest.fn(),
    isGitBranch: jest.fn(),
}))

describe('resolveType', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('Commit Type Tests', () => {
        it('should identify valid commit hash', () => {
            
            isGitCommit.mockReturnValue(true)

            
            const result = resolveType('1234567890abcdef')

            
            expect(result).toBe('commit')
        })

        it('should reject invalid commit hash format', () => {
            
            isGitCommit.mockReturnValue(false)
            isGitRef.mockReturnValue(false)
            isGitTag.mockReturnValue(false)
            isGitBranch.mockReturnValue(false)

            
            const result = resolveType('xyz123')

            
            expect(result).toBe('unknown')
            expect(isGitCommit).not.toHaveBeenCalled()
            expect(isGitRef).toHaveBeenCalledWith('xyz123')
            expect(isGitTag).toHaveBeenCalledWith('xyz123')
            expect(isGitBranch).toHaveBeenCalledWith('xyz123')
        })
    })

    describe('Date Type Tests', () => {
        it('should identify valid date format', () => {
            
            const result = resolveType('2024-01-01')

            
            expect(result).toBe('date')
        })

        it('should reject invalid date format', () => {
            
            const result = resolveType('2024/01/01')

            
            expect(result).toBe('unknown')
        })
    })

    describe('Tag Type Tests', () => {
        it('should identify semantic version tag', () => {
            
            isGitCommit.mockReturnValue(false)
            isGitTag.mockReturnValue(true)

            
            const result = resolveType('v1.0.0')

            
            expect(result).toBe('tag')
            expect(isGitCommit).not.toHaveBeenCalled()
            expect(isGitTag).toHaveBeenCalledWith('v1.0.0')
        })

        it('should identify semantic version without v prefix', () => {
            
            isGitCommit.mockReturnValue(false)
            isGitTag.mockReturnValue(true)

            
            const result = resolveType('1.0.0')

            
            expect(result).toBe('tag')
            expect(isGitCommit).not.toHaveBeenCalled()
            expect(isGitTag).toHaveBeenCalledWith('1.0.0')
        })

        it('should reject invalid semantic version', () => {
            
            isGitTag.mockReturnValue(false)

            
            const result = resolveType('v1.0')

            
            expect(result).toBe('unknown')
            expect(isGitTag).toHaveBeenCalledWith('v1.0')
        })
    })

    describe('Branch Type Tests', () => {
        it('should identify valid branch name', () => {
            
            isGitBranch.mockReturnValue(true)

            
            const result = resolveType('main')

            
            expect(result).toBe('branch')
            expect(isGitBranch).toHaveBeenCalledWith('main')
        })
    })

    describe('Ref Type Tests', () => {
        it('should identify HEAD reference', () => {
            
            isGitBranch.mockReturnValue(false)
            isGitTag.mockReturnValue(false)
            isGitCommit.mockReturnValue(false)
            isGitRef.mockReturnValue(true)

            
            const result = resolveType('HEAD')

            
            expect(result).toBe('ref')
            expect(isGitRef).toHaveBeenCalledWith('HEAD')
        })

        it('should identify HEAD with number reference', () => {
            
            isGitBranch.mockReturnValue(false)
            isGitTag.mockReturnValue(false)
            isGitCommit.mockReturnValue(false)
            isGitRef.mockReturnValue(true)

            
            const result = resolveType('HEAD~1')

            
            expect(result).toBe('ref')
            expect(isGitRef).toHaveBeenCalledWith('HEAD~1')
        })
    })

    describe('Unknown Type Tests', () => {
        it('should return unknown for empty string', () => {
            
            const result = resolveType('')

            
            expect(result).toBe('unknown')
        })

        it('should return unknown for invalid input', () => {
            
            const result = resolveType('!!invalid!!')

            
            expect(result).toBe('unknown')
        })

        it('should return unknown when git commands fail', () => {
            
            isGitBranch.mockReturnValue(false)
            isGitTag.mockReturnValue(false)
            isGitCommit.mockReturnValue(false)
            isGitRef.mockReturnValue(false)

            
            const result = resolveType('main')

            
            expect(result).toBe('unknown')
        })
    })
})
