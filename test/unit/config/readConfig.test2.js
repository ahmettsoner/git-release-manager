const path = require('path')
const { readConfig } = require('../../../src/config/configManager')

// Mock modules
jest.mock('yargs/yargs', () => {
    return () => ({
        argv: {},
    })
})

describe('readConfig', () => {
    let originalProcessCwd

    beforeEach(() => {
        // Save the original process.cwd
        originalProcessCwd = process.cwd
        // Clear all mocks before each test
        jest.clearAllMocks()
        // Reset modules cache
        jest.resetModules()
    })

    afterEach(() => {
        process.cwd = originalProcessCwd
    })

    test('should load default config when no local config exists', async () => {
        
        jest.mock(
            '../../src/config/defaultConfig.js',
            () => ({
                someDefault: 'value',
            }),
            { virtual: true }
        )

        jest.mock('../../.grm/config.js', () => ({}), { virtual: true })

        
        const config = await readConfig()

        
        expect(config).toEqual({ someDefault: 'value' })
    })

    test('should merge local config with default config', async () => {
        
        jest.mock(
            '../../src/config/defaultConfig.js',
            () => ({
                key1: 'default1',
                key2: 'default2',
            }),
            { virtual: true }
        )

        jest.mock(
            '../../.grm/config.js',
            () => ({
                key2: 'local2',
                key3: 'local3',
            }),
            { virtual: true }
        )

        
        const config = await readConfig()

        
        expect(config).toEqual({
            key1: 'default1',
            key2: 'local2', // Local config should override default
            key3: 'local3',
        })
    })

    test('should handle custom relative config path from CLI arguments', async () => {
        
        jest.mock('yargs/yargs', () => {
            return () => ({
                argv: { config: 'custom/config/path.js' },
            })
            0
        })

        jest.mock(
            '../../src/config/defaultConfig.js',
            () => ({
                key1: 'default1',
            }),
            { virtual: true }
        )

        jest.mock(
            '../../custom/config/path.js',
            () => ({
                key1: 'custom1',
                key2: 'custom2',
            }),
            { virtual: true }
        )

        
        const config = await readConfig()

        
        expect(config).toEqual({
            key1: 'custom1', // Custom config should override default
            key2: 'custom2',
        })
    })

    test('should throw error for other file system errors', async () => {
        
        jest.mock(
            '../../src/config/defaultConfig.js',
            () => {
                throw Object.assign(new Error('Permission denied'), { code: 'EACCES' })
            },
            { virtual: true }
        )

         & Assert
        await expect(readConfig()).rejects.toThrow('Permission denied')
    })
})
