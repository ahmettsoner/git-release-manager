const { spawn } = require('child_process')
const { runCommandAsync } = require('../../src/utils/cmd')

jest.mock('child_process', () => ({
    spawn: jest.fn(),
}))

describe('runCommandAsync', () => {
    let mockProcess

    beforeEach(() => {
        mockProcess = {
            stdout: {
                on: jest.fn(),
            },
            stderr: {
                on: jest.fn(),
            },
            on: jest.fn(),
        }
        spawn.mockReturnValue(mockProcess)
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should return stdout on successful command execution', async () => {
        
        const cmd = 'echo Hello'
        const expectedOutput = 'Hello'

        mockProcess.stdout.on.mockImplementation((event, callback) => {
            if (event === 'data') {
                callback(expectedOutput)
            }
        })

        mockProcess.on.mockImplementation((event, callback) => {
            if (event === 'close') {
                callback(0)
            }
        })

        
        const result = await runCommandAsync(cmd)

        
        expect(result).toBe(expectedOutput)
        expect(spawn).toHaveBeenCalledWith('echo', ['Hello'], { encoding: 'utf8' })
    })

    it('should return null and call onError on command execution error', async () => {
        
        const cmd = 'invalidCommand'
        const expectedError = 'command not found'
        const onError = jest.fn()

        mockProcess.stderr.on.mockImplementation((event, callback) => {
            if (event === 'data') {
                callback(expectedError)
            }
        })

        mockProcess.on.mockImplementation((event, callback) => {
            if (event === 'close') {
                callback(1)
            }
        })

        
        const result = await runCommandAsync(cmd, onError)

        
        expect(result).toBeNull()
        expect(onError).toHaveBeenCalledWith(cmd, expectedError, 1)
    })

    it('should return null and call onError on unexpected error', async () => {
        
        const cmd = 'echo Hello'
        const expectedError = 'Unexpected error'
        const onError = jest.fn()

        mockProcess.on.mockImplementation((event, callback) => {
            if (event === 'error') {
                callback(new Error(expectedError))
            }
        })

        
        const result = await runCommandAsync(cmd, onError)

        
        expect(result).toBeNull()
        expect(onError).toHaveBeenCalledWith(cmd, expectedError, null)
    })
})
