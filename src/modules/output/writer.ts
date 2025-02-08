import * as fs from 'fs'

export function writeOutput(data: string, output?: string): void {
    if (!output || output === 'stdout') {
        console.log(data)
    } else {
        fs.writeFileSync(output, data + '\n')
    }
}
