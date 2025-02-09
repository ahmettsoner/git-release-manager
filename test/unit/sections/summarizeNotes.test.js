const { summarizeNotes } = require('../../src/sections/index')

describe('summarizeNotes', () => {
    const mockConfig = {
        noteTypes: [
            { type: 'breaking', title: 'Breaking Changes', order: 1 },
            { type: 'deprecated', title: 'Deprecated', order: 2 },
        ],
    }

    const mockNotes = [
        {
            type: 'breaking',
            items: [{ text: 'API change 1' }, { text: 'API change 2' }],
        },
        {
            type: 'deprecated',
            items: [{ text: 'Deprecated feature 1' }],
        },
    ]

    test('should summarize notes correctly', () => {
        
        const summary = summarizeNotes(mockNotes, mockConfig)

        
        expect(summary).toBeInstanceOf(Array)
        expect(summary.length).toBe(2)

        // Check Breaking Changes summary
        expect(summary[0]).toEqual({
            type: 'breaking',
            title: 'Breaking Changes',
            count: 2,
            order: 1,
        })

        // Check Deprecated summary
        expect(summary[1]).toEqual({
            type: 'deprecated',
            title: 'Deprecated',
            count: 1,
            order: 2,
        })
    })

    test('should handle unknown note types', () => {
        
        const unknownNotes = [
            {
                type: 'unknown',
                items: [{ text: 'Unknown note' }],
            },
        ]

        
        const summary = summarizeNotes(unknownNotes, mockConfig)

        
        expect(summary[0].title).toBe('Other Notes')
        expect(summary[0].count).toBe(1)
    })

    test('should throw error for invalid input', () => {
         & Assert
        expect(() => summarizeNotes(null, mockConfig)).toThrow('Invalid input: array must be an array')
        expect(() => summarizeNotes(undefined, mockConfig)).toThrow('Invalid input: array must be an array')
        expect(() => summarizeNotes('not-an-array', mockConfig)).toThrow('Invalid input: array must be an array')
    })

    test('should sort by order', () => {
        
        const unorderedNotes = [
            {
                type: 'deprecated',
                items: [{ text: 'Deprecated' }],
            },
            {
                type: 'breaking',
                items: [{ text: 'Breaking' }],
            },
        ]

        
        const summary = summarizeNotes(unorderedNotes, mockConfig)

        
        expect(summary[0].type).toBe('breaking')
        expect(summary[1].type).toBe('deprecated')
    })
})
