const { getGitContextAsync } = require('../../../src/git/context')
const { getBranchesAsync, getCommitsAsync, getStatusAsync, getTagsAsync, parseRemoteUrl } = require('../../../src/git/contextHelper')

const { runCommandAsync } = require('../../../src/utils/cmd')

jest.mock('../../../src/utils/cmd', () => ({
    runCommandAsync: jest.fn(),
}))

jest.mock('../../../src/git/contextHelper', () => ({
    getBranchesAsync: jest.fn(),
    getCommitsAsync: jest.fn(),
    getStatusAsync: jest.fn(),
    getTagsAsync: jest.fn(),
    parseRemoteUrl: jest.fn(),
}))

describe('getGitContextAsync', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should return git context with all information', async () => {
        
        runCommandAsync.mockImplementation(command => {
            switch (command) {
                case 'git config --get remote.origin.url':
                    return 'https://github.com/user/repo.git'
                case 'git rev-parse --show-toplevel':
                    return '/path/to/repo'
                default:
                    return ''
            }
        })
        const mockBranches = { current: 'main', merged: ['feature'], unmerged: ['hotfix'] }
        const mockCommits = { latest: { hash: 'abcd1234' }, count: 42 }
        const mockTags = { latest: 'v1.0.0', all: ['v1.0.0', 'v0.9.0'] }
        const mockStatus = { modifiedFiles: ['file1.js'], untrackedFiles: ['file2.js'] }
        const mockRemote = {
            url: 'https://github.com/user/repo.git',
            host: 'github.com',
            owner: 'user',
            repository: 'repo',
            repoUrl: 'https://github.com/user/repo',
        }

        getBranchesAsync.mockResolvedValue(mockBranches)
        getCommitsAsync.mockResolvedValue(mockCommits)
        getStatusAsync.mockResolvedValue(mockStatus)
        getTagsAsync.mockResolvedValue(mockTags)
        parseRemoteUrl.mockReturnValue(mockRemote)

        
        const result = await getGitContextAsync()

        
        expect(result).toEqual({
            name: expect.any(String),
            path: expect.any(String),
            remote: mockRemote,
            branches: mockBranches,
            tags: mockTags,
            commits: mockCommits,
            status: mockStatus,
        })

        expect(getBranchesAsync).toHaveBeenCalledTimes(1)
        expect(getCommitsAsync).toHaveBeenCalledTimes(1)
        expect(getStatusAsync).toHaveBeenCalledTimes(1)
        expect(getTagsAsync).toHaveBeenCalledTimes(1)
        expect(parseRemoteUrl).toHaveBeenCalledTimes(1)
    })

    it('should handle errors from git commands', async () => {
        
        const mockError = new Error('Git command failed')
        getBranchesAsync.mockRejectedValue(mockError)

        
        await expect(getGitContextAsync()).rejects.toThrow('Git command failed')

        
        expect(getBranchesAsync).toHaveBeenCalledTimes(1)
    })
})
