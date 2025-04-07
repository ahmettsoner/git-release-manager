const { getStatusAsync } = require('../../../src/git/contextHelper')
const { runCommandAsync } = require('../../../src/utils/cmd')

jest.mock('../../../src/utils/cmd', () => ({
    runCommandAsync: jest.fn(),
}))

describe('getStatusAsync', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should return status information correctly', async () => {
        
        runCommandAsync.mockImplementation(command => {
            switch (command) {
                case 'git diff --name-only':
                    return 'src/file1.js\nsrc/file2.js'
                case 'git ls-files --others --exclude-standard':
                    return 'new/file1.js\nnew/file2.js'
                default:
                    return ''
            }
        })

        
        const result = await getStatusAsync()

        
        expect(result).toEqual({
            modifiedFiles: ['src/file1.js', 'src/file2.js'],
            untrackedFiles: ['new/file1.js', 'new/file2.js'],
        })

        expect(runCommandAsync).toHaveBeenCalledTimes(2)
        expect(runCommandAsync).toHaveBeenCalledWith('git diff --name-only')
        expect(runCommandAsync).toHaveBeenCalledWith('git ls-files --others --exclude-standard')
    })

    it('should handle empty responses', async () => {
        
        runCommandAsync.mockResolvedValue('')

        
        const result = await getStatusAsync()

        
        expect(result).toEqual({
            modifiedFiles: [],
            untrackedFiles: [],
        })
    })

    it('should handle error responses', async () => {
        runCommandAsync.mockRejectedValue(new Error('Git command failed'))

        await expect(getStatusAsync()).rejects.toThrow('Git command failed')
    })

    it('should clean file lists properly', async () => {
        
        runCommandAsync.mockImplementation(command => {
            switch (command) {
                case 'git diff --name-only':
                    return '  file1.js  \n\n  file2.js\n'
                case 'git ls-files --others --exclude-standard':
                    return '  new1.js  \n\n  new2.js\n'
                default:
                    return ''
            }
        })

        
        const result = await getStatusAsync()

        
        expect(result).toEqual({
            modifiedFiles: ['file1.js', 'file2.js'],
            untrackedFiles: ['new1.js', 'new2.js'],
        })
    })
})
