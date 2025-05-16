import { jest } from '@jest/globals'
import * as fs from 'fs'
import { loadConfigFile } from '../../../src/config/configLoader'

jest.mock('fs', () => ({
    promises: {
        readFile: jest.fn(),
    },
}))

describe('loadConfigFile', () => {
    const mockPath = '/mock/path/config.json'

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('should load and parse config file successfully', async () => {
        const mockConfig = {
            appName: 'sample-app',
            helpers: {
                formatCommit: 'function(commit) { return commit.toUpperCase(); }',
            },
        }

        const readFileMock = fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>
        readFileMock.mockResolvedValue(JSON.stringify(mockConfig))

        const result = await loadConfigFile(mockPath)

        // Use mockResult where needed in your test setup
        expect(fs.promises.readFile).toHaveBeenCalledWith(mockPath, 'utf-8')
        expect(result).toHaveProperty('helpers')
        expect(typeof result.helpers?.formatCommit).toBe('function')
    })

    it('should return empty object when file does not exist', async () => {
        const error = new Error('File not found')
        ;(error as NodeJS.ErrnoException).code = 'ENOENT'

        const readFileMock = fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>
        readFileMock.mockRejectedValue(error)

        const result = await loadConfigFile(mockPath)

        expect(result).toEqual({})
    })

    it('should throw error for other file system errors', async () => {
        const error = new Error('Permission denied')

        const readFileMock = fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>
        readFileMock.mockRejectedValue(error)

        await expect(loadConfigFile(mockPath)).rejects.toThrow('Permission denied')
    })

    it('should handle config without helpers', async () => {
        const mockConfig = {
            someOtherProperty: 'value',
        }

        const readFileMock = fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>
        readFileMock.mockResolvedValue(JSON.stringify(mockConfig))

        const result = await loadConfigFile(mockPath)

        expect(result).toEqual(mockConfig)
    })

    it('should handle invalid JSON', async () => {
        const readFileMock = fs.promises.readFile as jest.MockedFunction<typeof fs.promises.readFile>
        readFileMock.mockResolvedValue('invalid json')

        await expect(loadConfigFile(mockPath)).rejects.toThrow(SyntaxError)
    })
})
