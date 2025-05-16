const { getGitHubProfileUrl } = require('../../../src/parsers/commit')

global.fetch = jest.fn()

describe('getGitHubProfileUrl', () => {
    beforeEach(() => {
        fetch.mockClear()
    })

    it('should return GitHub profile URL when user is found', async () => {
        
        const mockResponse = {
            ok: true,
            json: () =>
                Promise.resolve({
                    total_count: 1,
                    items: [{ html_url: 'https://github.com/username' }],
                }),
        }
        fetch.mockResolvedValueOnce(mockResponse)

        
        const result = await getGitHubProfileUrl('user@example.com', 'mock-token')

        
        expect(result).toBe('https://github.com/username')
        expect(fetch).toHaveBeenCalledWith(
            'https://api.github.com/search/users?q=user@example.com',
            expect.objectContaining({
                headers: {
                    Authorization: 'token mock-token',
                },
            })
        )
    })

    it('should return null when no user is found', async () => {
        
        const mockResponse = {
            ok: true,
            json: () =>
                Promise.resolve({
                    total_count: 0,
                    items: [],
                }),
        }
        fetch.mockResolvedValueOnce(mockResponse)

        
        const result = await getGitHubProfileUrl('nonexistent@example.com', 'mock-token')

        
        expect(result).toBeNull()
    })

    it('should handle API errors', async () => {
        
        const mockResponse = {
            ok: false,
            statusText: 'Rate limit exceeded',
        }
        fetch.mockResolvedValueOnce(mockResponse)

        
        const result = await getGitHubProfileUrl('user@example.com', 'mock-token')

        
        expect(result).toBeNull()
    })

    it('should handle network errors', async () => {
        
        fetch.mockRejectedValueOnce(new Error('Network error'))

        
        const result = await getGitHubProfileUrl('user@example.com', 'mock-token')

        
        expect(result).toBeNull()
    })

    it('should handle malformed response', async () => {
        
        const mockResponse = {
            ok: true,
            json: () =>
                Promise.resolve({
                    total_count: 1,
                    items: [{}], // Missing html_url
                }),
        }
        fetch.mockResolvedValueOnce(mockResponse)

        
        const result = await getGitHubProfileUrl('user@example.com', 'mock-token')

        
        expect(result).toBeNull()
    })
})
