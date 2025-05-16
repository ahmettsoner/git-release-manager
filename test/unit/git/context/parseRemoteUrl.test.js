const { parseRemoteUrl } = require('../../../src/git/contextHelper')

describe('parseRemoteUrl', () => {
    it('should parse HTTPS remote URL correctly', () => {
        
        const url = 'https://github.com/owner/repo.git'

        
        const result = parseRemoteUrl(url)

        
        expect(result).toEqual({
            url: 'https://github.com/owner/repo.git',
            host: 'github.com',
            owner: 'owner',
            repository: 'repo',
            repoUrl: 'https://github.com/owner/repo',
        })
    })

    it('should parse SSH remote URL correctly', () => {
        
        const url = 'git@github.com:owner/repo.git'

        
        const result = parseRemoteUrl(url)

        
        expect(result).toEqual({
            url: 'git@github.com:owner/repo.git',
            host: 'github.com',
            owner: 'owner',
            repository: 'repo',
            repoUrl: 'https://github.com/owner/repo',
        })
    })

    it('should parse URL without .git extension', () => {
        
        const url = 'https://github.com/owner/repo'

        
        const result = parseRemoteUrl(url)

        
        expect(result).toEqual({
            url: 'https://github.com/owner/repo',
            host: 'github.com',
            owner: 'owner',
            repository: 'repo',
            repoUrl: 'https://github.com/owner/repo',
        })
    })

    it('should return null for empty URL', () => {
         & Assert
        expect(parseRemoteUrl('')).toBeNull()
        expect(parseRemoteUrl(null)).toBeNull()
        expect(parseRemoteUrl(undefined)).toBeNull()
    })

    it('should throw error for invalid URL format', () => {
        
        const invalidUrls = ['invalid-url', 'https://github.com', 'git@github.com', 'https://github.com/only-owner']

         & Assert
        invalidUrls.forEach(url => {
            expect(() => parseRemoteUrl(url)).toThrow(`Could not parse remote URL: ${url}`)
        })
    })
})
