const fs = require('fs')
const path = require('path')
const { resolveTemplatePath } = require('../../src/templates')

// Mock fs and path modules
jest.mock('fs')
jest.mock('path', () => ({
    ...jest.requireActual('path'),
    resolve: jest.fn(),
}))

describe('resolveTemplatePath', () => {
    const DEFAULT_TEMPLATE_PATH = path.resolve(__dirname, '../../src/templates/changelog.ejs')
    const LOCAL_TEMPLATE_PATH = path.resolve(process.cwd(), '.grm/templates/changelog.ejs')

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks()
        path.resolve.mockImplementation(p => p)
    })

    test('should return custom template path when valid path is provided', async () => {
        const customPath = '/custom/template/path.ejs'
        fs.existsSync.mockReturnValue(true)
        path.resolve.mockReturnValue(customPath)

        const result = await resolveTemplatePath(customPath)

        expect(result).toBe(customPath)
        expect(fs.existsSync).toHaveBeenCalledWith(customPath)
    })

    test('should throw error when custom template path does not exist', async () => {
        const invalidPath = '/invalid/path.ejs'
        fs.existsSync.mockImplementation(() => {
            throw { code: 'ENOENT' }
        })
        path.resolve.mockReturnValue(invalidPath)

        await expect(resolveTemplatePath(invalidPath)).rejects.toThrow(`Template file not found at: ${invalidPath}`)
    })

    test('should return local template path when no custom path and local template exists', async () => {
        fs.existsSync.mockImplementation(p => p === LOCAL_TEMPLATE_PATH)

        const result = await resolveTemplatePath()

        expect(result).toBe(LOCAL_TEMPLATE_PATH)
        expect(fs.existsSync).toHaveBeenCalledWith(LOCAL_TEMPLATE_PATH)
    })

    test('should return default template path when no custom or local template exists', async () => {
        fs.existsSync.mockReturnValue(false)

        const result = await resolveTemplatePath()

        expect(result).toBe(DEFAULT_TEMPLATE_PATH)
        expect(fs.existsSync).toHaveBeenCalledWith(LOCAL_TEMPLATE_PATH)
    })

    test('should throw error for other fs errors', async () => {
        const customPath = '/error/path.ejs'
        const error = new Error('Random FS error')
        fs.existsSync.mockImplementation(() => {
            throw error
        })
        path.resolve.mockReturnValue(customPath)

        await expect(resolveTemplatePath(customPath)).rejects.toThrow(error)
    })
})
