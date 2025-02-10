const { summarizeCommits } = require('../../src/sections/index')

describe('summarizeCommits', () => {
    const mockConfig = {
        commitTypes: [
            { type: 'feat', title: 'Features', order: 1 },
            { type: 'fix', title: 'Bug Fixes', order: 2 },
        ],
    }

    const mockCommits = [
        {
            type: 'feat',
            items: [{ message: 'Add new feature 1' }, { message: 'Add new feature 2' }],
        },
        {
            type: 'fix',
            items: [{ message: 'Fix bug 1' }],
        },
    ]

    test('should summarize commits correctly', () => {
        
        const summary = summarizeCommits(mockCommits, mockConfig)

        
        expect(summary).toBeInstanceOf(Array)
        expect(summary.length).toBe(2)

        // Check Features summary
        expect(summary[0]).toEqual({
            type: 'feat',
            title: 'Features',
            count: 2,
            order: 1,
        })

        // Check Bug Fixes summary
        expect(summary[1]).toEqual({
            type: 'fix',
            title: 'Bug Fixes',
            count: 1,
            order: 2,
        })
    })

    test('should handle unknown commit types', () => {
        
        const unknownCommits = [
            {
                type: 'unknown',
                items: [{ message: 'Unknown change' }],
            },
        ]

        
        const summary = summarizeCommits(unknownCommits, mockConfig)

        
        expect(summary[0].title).toBe('Other Changes')
        expect(summary[0].count).toBe(1)
    })

    test('should throw error for invalid input', () => {
         & Act
        expect(() => summarizeCommits(null, mockConfig)).toThrow('Invalid input: commits must be an array')
        expect(() => summarizeCommits(undefined, mockConfig)).toThrow('Invalid input: commits must be an array')
        expect(() => summarizeCommits('not-an-array', mockConfig)).toThrow('Invalid input: commits must be an array')
    })

    test('should sort by order', () => {
        
        const unorderedCommits = [
            {
                type: 'fix',
                items: [{ message: 'Fix' }],
            },
            {
                type: 'feat',
                items: [{ message: 'Feature' }],
            },
        ]

        
        const summary = summarizeCommits(unorderedCommits, mockConfig)

        
        expect(summary[0].type).toBe('feat')
        expect(summary[1].type).toBe('fix')
    })
})
