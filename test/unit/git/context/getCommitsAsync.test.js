const { getCommitsAsync } = require('../../../src/git/contextHelper')
const { runCommandAsync } = require('../../../src/utils/cmd')

jest.mock('../../../src/utils/cmd', () => ({
    runCommandAsync: jest.fn(),
}))

describe('getCommitsAsync', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should return commit information correctly', async () => {
        
        runCommandAsync.mockImplementation(command => {
            switch (command) {
                case "git log -1 --pretty=format:'%H'":
                    return 'abcdef1234567890abcdef1234567890'
                case "git log -1 --pretty=format:'%h'":
                    return 'abcdef1'
                case "git log -1 --pretty=format:'%s'":
                    return 'feat: implement new feature'
                case 'git log -1 --pretty=format:"%an <%ae>"':
                    return 'John Doe <john@example.com>'
                case "git log -1 --pretty=format:'%ad'":
                    return 'Thu Mar 7 10:30:00 2024'
                case 'git rev-list --count HEAD':
                    return '42'
                default:
                    return ''
            }
        })

        
        const result = await getCommitsAsync()

        
        expect(result).toEqual({
            latest: {
                hash: 'abcdef1234567890abcdef1234567890',
                shortHash: 'abcdef1',
                message: 'feat: implement new feature',
                author: 'John Doe <john@example.com>',
                date: 'Thu Mar 7 10:30:00 2024',
            },
            count: 42,
        })

        expect(runCommandAsync).toHaveBeenCalledTimes(6)
    })

    it('should handle empty responses', async () => {
        
        runCommandAsync.mockResolvedValue('')

        
        const result = await getCommitsAsync()

        
        expect(result).toEqual({
            latest: {
                hash: '',
                shortHash: '',
                message: '',
                author: '',
                date: '',
            },
            count: 0,
        })
    })

    it('should handle error responses', async () => {
        
        runCommandAsync.mockImplementation(command => {
            switch (command) {
                case "git log -1 --pretty=format:'%H'":
                    return null
                case "git log -1 --pretty=format:'%h'":
                    return null
                case "git log -1 --pretty=format:'%s'":
                    return null
                case 'git log -1 --pretty=format:"%an <%ae>"':
                    return null
                case "git log -1 --pretty=format:'%ad'":
                    return null
                case 'git rev-list --count HEAD':
                    return null
                default:
                    return ''
            }
        })

        
        const result = await getCommitsAsync()

        
        expect(result).toEqual({
            latest: {
                hash: null,
                shortHash: null,
                message: null,
                author: null,
                date: null,
            },
            count: 0,
        })
    })

    it('should parse commit count as integer', async () => {
        
        runCommandAsync.mockImplementation(command => {
            if (command === 'git rev-list --count HEAD') {
                return '42\n' // with newline
            }
            return ''
        })

        
        const result = await getCommitsAsync()

        
        expect(result.count).toBe(42)
    })
})
