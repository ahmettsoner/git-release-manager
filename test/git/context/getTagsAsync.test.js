const { getTagsAsync } = require('../../../src/git/contextHelper')
const { runCommandAsync } = require('../../../src/utils/cmd')

jest.mock('../../../src/utils/cmd', () => ({
    runCommandAsync: jest.fn(),
}))

describe('getTagsAsync', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should return tags information correctly', async () => {
        
        runCommandAsync.mockImplementation(command => {
            switch (command) {
                case 'git describe --tags':
                    return 'v1.2.3'
                case 'git tag':
                    return 'v1.0.0\nv1.1.0\nv1.2.0\nv1.2.3'
                default:
                    return ''
            }
        })

        
        const result = await getTagsAsync()

        
        expect(result).toEqual({
            latest: 'v1.2.3',
            all: ['v1.0.0', 'v1.1.0', 'v1.2.0', 'v1.2.3'],
        })

        expect(runCommandAsync).toHaveBeenCalledTimes(2)
        expect(runCommandAsync).toHaveBeenCalledWith('git describe --tags')
        expect(runCommandAsync).toHaveBeenCalledWith('git tag')
    })

    it('should handle empty responses', async () => {
        
        runCommandAsync.mockResolvedValue('')

        
        const result = await getTagsAsync()

        
        expect(result).toEqual({
            latest: '',
            all: [],
        })
    })

    it('should handle error responses', async () => {
        
        runCommandAsync.mockRejectedValue(new Error('Git command failed'))

         & Assert
        await expect(getTagsAsync()).rejects.toThrow('Git command failed')
    })

    it('should clean tag list properly', async () => {
        
        runCommandAsync.mockImplementation(command => {
            if (command === 'git tag') {
                return '  tag1  \n\n  tag2\n  tag3  \n\n'
            }
            return 'latest-tag'
        })

        
        const result = await getTagsAsync()

        
        expect(result).toEqual({
            latest: 'latest-tag',
            all: ['tag1', 'tag2', 'tag3'],
        })
    })
})
