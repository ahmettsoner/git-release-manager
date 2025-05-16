const { createSections } = require('../../src/sections/index')

describe('createSections', () => {
    const mockConfig = {
        commitTypes: [
            { type: 'feat', title: 'Features', order: 1, terms: ['feat'] },
            { type: 'fix', title: 'Bug Fixes', order: 2, terms: ['fix'] },
        ],
        noteTypes: [{ type: 'breaking', title: 'Breaking Changes', order: 1 }],
        fileGroups: {
            Frontend: ['src/frontend'],
            Backend: ['src/backend'],
        },
    }

    const mockCommits = [
        {
            type: 'feat',
            notes: [{ type: 'breaking', text: 'API changes' }],
            author: { name: 'John', email: 'john@example.com' },
            files: ['src/frontend/app.js'],
        },
        {
            type: 'fix',
            author: { name: 'Jane', email: 'jane@example.com' },
            files: ['src/backend/server.js'],
        },
    ]

    test('should create sections with valid input', () => {
         & Act
        const sections = createSections(mockCommits, mockConfig)

        
        // Check if all required sections exist
        expect(sections).toHaveProperty('commits')
        expect(sections).toHaveProperty('notes')
        expect(sections).toHaveProperty('contributors')
        expect(sections).toHaveProperty('summary')

        // Check commits section
        expect(sections.commits).toBeInstanceOf(Array)
        expect(sections.commits.length).toBeGreaterThan(0)

        // Check notes section
        expect(sections.notes).toBeInstanceOf(Array)

        // Check contributors section
        expect(sections.contributors).toBeInstanceOf(Array)
        expect(sections.contributors.length).toBeGreaterThan(0)

        // Check summary section
        expect(sections.summary).toHaveProperty('commits')
        expect(sections.summary).toHaveProperty('notes')
        expect(sections.summary).toHaveProperty('contributors')
    })

    test('should handle empty commits array', () => {
        
        const sections = createSections([], mockConfig)

        
        expect(sections.commits).toBeInstanceOf(Array)
        expect(sections.commits.length).toBe(0)
        expect(sections.notes).toBeInstanceOf(Array)
        expect(sections.notes.length).toBe(0)
        expect(sections.contributors).toBeInstanceOf(Array)
        expect(sections.contributors.length).toBe(0)
    })

    test('should throw error for invalid input', () => {
         & Assert
        expect(() => createSections(null, mockConfig)).toThrow()
        expect(() => createSections(undefined, mockConfig)).toThrow()
        expect(() => createSections('not-an-array', mockConfig)).toThrow()
    })
})
