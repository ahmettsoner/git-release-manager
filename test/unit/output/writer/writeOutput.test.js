const { writeOutput } = require('../../../src/output/writer')
const fs = require('fs')
const path = require('path')

jest.mock('fs')
jest.spyOn(console, 'log').mockImplementation(() => {})

describe('writeOutput', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    test('should write to console when output is stdout', () => {
        const testData = 'Test changelog data'
        writeOutput(testData, 'stdout')
        expect(console.log).toHaveBeenCalledWith(testData)
        expect(fs.writeFileSync).not.toHaveBeenCalled()
    })

    test('should write to console when output is undefined', () => {
        const testData = 'Test changelog data'
        writeOutput(testData)
        expect(console.log).toHaveBeenCalledWith(testData)
        expect(fs.writeFileSync).not.toHaveBeenCalled()
    })

    test('should write to file when output path is provided', () => {
        const testData = 'Test changelog data'
        const outputPath = 'output.md'
        writeOutput(testData, outputPath)
        expect(fs.writeFileSync).toHaveBeenCalledWith(outputPath, testData + '\n')
        expect(console.log).not.toHaveBeenCalled()
    })
})
