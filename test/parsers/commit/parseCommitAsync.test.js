const { enrichCommit } = require('../../../src/parsers/commit')

describe('enrichCommit', () => {
    const mockConfig = {
        mentionTypes: [{ type: 'reviewer', title: 'Reviewed By', terms: ['reviewed-by'] }],
        linkTypes: [{ type: 'issue', title: 'Issues', terms: ['closes', 'fixes'], sign: ['#'] }],
        commitTypes: [{ type: 'feat', title: 'Features', terms: ['feat'] }],
    }

    it('should parse a complete commit message', async () => {
        
        const commit = {
            message: 'feat(core): add new feature',
            body: 'Description of the feature\nreviewed-by: John Doe <john@example.com>\ncloses: 123\nTags: important,urgent',
            authorName: 'Jane Doe',
            authorEmail: 'jane@example.com',
        }

        
        const result = await enrichCommit(commit, mockConfig)

        
        expect(result).toMatchObject({
            type: 'feat',
            typeTitle: 'Features',
            scope: 'core',
            summary: 'add new feature',
            author: {
                name: 'Jane Doe',
                email: 'jane@example.com',
            },
            labels: ['important', 'urgent'],
        })
        expect(result.mentions).toHaveLength(1)
        expect(result.links).toHaveLength(1)
    })

    it('should handle commit message without conventional commit format', async () => {
        
        const commit = {
            message: 'Simple commit message',
            authorName: 'Jane Doe',
            authorEmail: 'jane@example.com',
        }

        
        const result = await enrichCommit(commit, mockConfig)

        
        expect(result).toMatchObject({
            type: null,
            typeTitle: 'Other Changes',
            scope: null,
            modifier: null,
            summary: 'Simple commit message',
        })
    })

    it('should handle commit with link signs in message', async () => {
        
        const commit = {
            message: 'fix: resolve bug #456',
            authorName: 'Jane Doe',
            authorEmail: 'jane@example.com',
        }

        
        const result = await enrichCommit(commit, mockConfig)

        
        expect(result.links).toContainEqual(
            expect.objectContaining({
                type: 'issue',
                id: 456,
            })
        )
    })

    it('should handle commit with link signs in body', async () => {
        
        const commit = {
            message: 'fix: resolve bug',
            body: 'resolved bug #456',
            authorName: 'Jane Doe',
            authorEmail: 'jane@example.com',
        }

        
        const result = await enrichCommit(commit, mockConfig)

        
        expect(result.links).toContainEqual(
            expect.objectContaining({
                type: 'issue',
                id: 456,
            })
        )
    })

    it('should handle commit with notes', async () => {
        
        const commit = {
            message: 'feat: add feature',
            body: 'BREAKING CHANGE: This changes the API\nNOTE: Important information',
            authorName: 'Jane Doe',
            authorEmail: 'jane@example.com',
        }

        
        const result = await enrichCommit(commit, mockConfig)

        
        expect(result.notes).toContainEqual({
            type: 'breaking change',
            content: 'This changes the API',
        })
        expect(result.notes).toContainEqual({
            type: 'note',
            content: 'Important information',
        })
    })
})
