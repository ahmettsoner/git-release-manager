const fs = require('fs')
const ejs = require('ejs')
const path = require('path')
const { renderTemplate } = require('../../src/templates')

// Mock dependencies
jest.mock('fs')
jest.mock('ejs')
jest.mock('../../src/templates', () => ({
    ...jest.requireActual('../../src/templates'),
    resolveTemplatePath: jest.fn(),
}))
jest.mock('path', () => ({
    ...jest.requireActual('path'),
    resolve: jest.fn(),
}))

describe('renderTemplate', () => {
    const mockTemplatePath = '/path/to/template.ejs'
    const mockTemplateContent = '<%= title %>'
    const mockData = { title: 'Test Changelog' }
    const mockRenderedContent = 'Test Changelog'

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks()

        // Setup default mock implementations
        path.resolve.mockImplementation(p => p)
        fs.readFileSync.mockReturnValue(mockTemplateContent)
        ejs.render.mockReturnValue(mockRenderedContent)
        require('../../src/templates').resolveTemplatePath.mockResolvedValue(mockTemplatePath)
    })

    test('should render template with provided data', async () => {
        fs.existsSync.mockReturnValue(true)
        path.resolve.mockReturnValue(mockTemplatePath)

        const result = await renderTemplate(mockTemplatePath, mockData)

        expect(result).toBe(mockRenderedContent)
        expect(fs.readFileSync).toHaveBeenCalledWith(mockTemplatePath, 'utf-8')
        expect(ejs.render).toHaveBeenCalledWith(mockTemplateContent, { ...mockData })
    })

    test('should handle empty data object', async () => {
        await renderTemplate(mockTemplatePath, {})

        expect(ejs.render).toHaveBeenCalledWith(mockTemplateContent, {})
    })

    test('should handle template reading errors', async () => {
        const error = new Error('File read error')
        fs.readFileSync.mockImplementation(() => {
            throw error
        })

        await expect(renderTemplate(mockTemplatePath, mockData)).rejects.toThrow(error)
    })

    test('should handle template rendering errors', async () => {
        const error = new Error('Template rendering error')
        ejs.render.mockImplementation(() => {
            throw error
        })

        await expect(renderTemplate(mockTemplatePath, mockData)).rejects.toThrow(error)
    })
})
