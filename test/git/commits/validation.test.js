const { isGitCommit, isGitRef, isGitTag, isGitBranch } = require('../../../src/git/validation')
const { runCommand } = require('../../../src/utils/cmd')

jest.mock('../../../src/utils/cmd')

describe('Git Validation Functions', () => {
    afterEach(() => {
        jest.clearAllMocks()
    })

    describe('isGitCommit', () => {
        it('should return true for a valid git commit', () => {
            
            const commitHash = 'abc123'
            runCommand.mockReturnValue('')

            
            const result = isGitCommit(commitHash)

            
            expect(result).toBe(true)
            expect(runCommand).toHaveBeenCalledWith(`git cat-file -e ${commitHash}`)
        })

        it('should return false for an invalid git commit', () => {
            
            const commitHash = 'invalidHash'
            runCommand.mockReturnValue('error: invalid object name')

            
            const result = isGitCommit(commitHash)

            
            expect(result).toBe(false)
            expect(runCommand).toHaveBeenCalledWith(`git cat-file -e ${commitHash}`)
        })

        it('should return false if runCommand returns null', () => {
            
            const commitHash = 'abc123'
            runCommand.mockReturnValue(null)

            
            const result = isGitCommit(commitHash)

            
            expect(result).toBe(false)
            expect(runCommand).toHaveBeenCalledWith(`git cat-file -e ${commitHash}`)
        })
    })

    describe('isGitRef', () => {
        it('should return true for a valid git ref', () => {
            
            const ref = 'refs/heads/main'
            runCommand.mockReturnValue('refs/heads/main')

            
            const result = isGitRef(ref)

            
            expect(result).toBe(true)
            expect(runCommand).toHaveBeenCalledWith(`git rev-parse --verify ${ref}`)
        })

        it('should return false for an invalid git ref', () => {
            
            const ref = 'invalidRef'
            runCommand.mockReturnValue(null)

            
            const result = isGitRef(ref)

            
            expect(result).toBe(false)
            expect(runCommand).toHaveBeenCalledWith(`git rev-parse --verify ${ref}`)
        })

        it('should return false if runCommand returns null', () => {
            
            const ref = 'refs/heads/main'
            runCommand.mockReturnValue(null)

            
            const result = isGitRef(ref)

            
            expect(result).toBe(false)
            expect(runCommand).toHaveBeenCalledWith(`git rev-parse --verify ${ref}`)
        })
    })

    describe('isGitTag', () => {
        it('should return true for a valid git tag', () => {
            
            const tag = 'v1.0.0'
            runCommand.mockReturnValue('refs/tags/v1.0.0')

            
            const result = isGitTag(tag)

            
            expect(result).toBe(true)
            expect(runCommand).toHaveBeenCalledWith(`git show-ref --tags ${tag}`)
        })

        it('should return false for an invalid git tag', () => {
            
            const tag = 'invalidTag'
            runCommand.mockReturnValue(null)

            
            const result = isGitTag(tag)

            
            expect(result).toBe(false)
            expect(runCommand).toHaveBeenCalledWith(`git show-ref --tags ${tag}`)
        })

        it('should return false if runCommand returns null', () => {
            
            const tag = 'v1.0.0'
            runCommand.mockReturnValue(null)

            
            const result = isGitTag(tag)

            
            expect(result).toBe(false)
            expect(runCommand).toHaveBeenCalledWith(`git show-ref --tags ${tag}`)
        })
    })

    describe('isGitBranch', () => {
        it('should return true for a valid git branch', () => {
            
            const branch = 'main'
            runCommand.mockReturnValue('refs/heads/main')

            
            const result = isGitBranch(branch)

            
            expect(result).toBe(true)
            expect(runCommand).toHaveBeenCalledWith(`git show-ref --heads ${branch}`)
        })

        it('should return false for an invalid git branch', () => {
            
            const branch = 'invalidBranch'
            runCommand.mockReturnValue(null)

            
            const result = isGitBranch(branch)

            
            expect(result).toBe(false)
            expect(runCommand).toHaveBeenCalledWith(`git show-ref --heads ${branch}`)
        })

        it('should return false if runCommand returns null', () => {
            
            const branch = 'main'
            runCommand.mockReturnValue(null)

            
            const result = isGitBranch(branch)

            
            expect(result).toBe(false)
            expect(runCommand).toHaveBeenCalledWith(`git show-ref --heads ${branch}`)
        })
    })
})
