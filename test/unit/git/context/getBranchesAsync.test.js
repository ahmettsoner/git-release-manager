const { getBranchesAsync } = require('../../../src/git/contextHelper')
const { runCommandAsync } = require('../../../src/utils/cmd')

jest.mock('../../../src/utils/cmd', () => ({
    runCommandAsync: jest.fn(),
}))

describe('getBranchesAsync', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should return current, merged and unmerged branches', async () => {
        
        runCommandAsync.mockImplementation(command => {
            switch (command) {
                case 'git branch --show-current':
                    return 'main'
                case 'git branch --merged':
                    return '  main\n  develop\n  feature/completed'
                case 'git branch --no-merged':
                    return '  feature/in-progress\n  bugfix/issue-123'
                default:
                    return ''
            }
        })

        
        const result = await getBranchesAsync()

        
        expect(result).toEqual({
            current: 'main',
            merged: ['main', 'develop', 'feature/completed'],
            unmerged: ['feature/in-progress', 'bugfix/issue-123'],
        })

        expect(runCommandAsync).toHaveBeenCalledTimes(3)
        expect(runCommandAsync).toHaveBeenCalledWith('git branch --show-current')
        expect(runCommandAsync).toHaveBeenCalledWith('git branch --merged')
        expect(runCommandAsync).toHaveBeenCalledWith('git branch --no-merged')
    })

    it('should handle empty responses', async () => {
        
        runCommandAsync.mockResolvedValue('')

        
        const result = await getBranchesAsync()

        
        expect(result).toEqual({
            current: '',
            merged: [],
            unmerged: [],
        })
    })

    it('should handle error responses', async () => {
        
        runCommandAsync.mockImplementation(command => {
            switch (command) {
                case 'git branch --show-current':
                    return null
                case 'git branch --merged':
                    return null
                case 'git branch --no-merged':
                    return null
                default:
                    return ''
            }
        })

        
        const result = await getBranchesAsync()

        
        expect(result).toEqual({
            current: null,
            merged: [],
            unmerged: [],
        })
    })

    it('should clean branch names properly', async () => {
        
        runCommandAsync.mockImplementation(command => {
            switch (command) {
                case 'git branch --show-current':
                    return 'main  '
                case 'git branch --merged':
                    return '  branch1  \n\n  branch2\n'
                case 'git branch --no-merged':
                    return '  branch3  \n\n'
                default:
                    return ''
            }
        })

        
        const result = await getBranchesAsync()

        
        expect(result).toEqual({
            current: 'main  ',
            merged: ['branch1', 'branch2'],
            unmerged: ['branch3'],
        })
    })
})
