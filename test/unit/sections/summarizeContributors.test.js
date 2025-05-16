const { summarizeContributors } = require('../../src/sections/index')

describe('summarizeContributors', () => {
    const mockContributors = [
        {
            email: 'john@example.com',
            name: 'John Doe',
            profileUrl: 'https://github.com/johndoe',
            groups: ['backend', 'frontend'],
        },
        {
            email: 'jane@example.com',
            name: 'Jane Smith',
            profileUrl: 'https://github.com/janesmith',
            groups: ['docs'],
        },
        {
            email: 'john@example.com', // Duplicate contributor
            name: 'John Doe',
            profileUrl: 'https://github.com/johndoe',
            groups: ['tests'],
        },
    ]

    test('should summarize contributors correctly', () => {
        
        const summary = summarizeContributors(mockContributors, {})

        
        expect(summary).toBeInstanceOf(Array)
        expect(summary.length).toBe(2) // Should combine duplicates

        // Check first contributor
        const johnSummary = summary.find(c => c.email === 'john@example.com')
        expect(johnSummary).toBeDefined()
        expect(johnSummary.name).toBe('John Doe')
        expect(johnSummary.profileUrl).toBe('https://github.com/johndoe')
        expect(johnSummary.count).toBe(2) // Combined group count

        // Check second contributor
        const janeSummary = summary.find(c => c.email === 'jane@example.com')
        expect(janeSummary).toBeDefined()
        expect(janeSummary.name).toBe('Jane Smith')
        expect(janeSummary.profileUrl).toBe('https://github.com/janesmith')
        expect(janeSummary.count).toBe(1)
    })

    test('should handle empty contributors array', () => {
        
        const summary = summarizeContributors([], {})

        
        expect(summary).toBeInstanceOf(Array)
        expect(summary.length).toBe(0)
    })

    test('should throw error for invalid input', () => {
         & Assert
        expect(() => summarizeContributors(null, {})).toThrow('Invalid input: array must be an array')
        expect(() => summarizeContributors(undefined, {})).toThrow('Invalid input: array must be an array')
        expect(() => summarizeContributors('not-an-array', {})).toThrow('Invalid input: array must be an array')
    })

    test('should handle contributors without groups', () => {
        
        const contributorsWithoutGroups = [
            {
                email: 'test@example.com',
                name: 'Test User',
                profileUrl: 'https://github.com/testuser',
            },
        ]

        
        const summary = summarizeContributors(contributorsWithoutGroups, {})

        
        expect(summary[0].count).toBe(0)
    })
})
