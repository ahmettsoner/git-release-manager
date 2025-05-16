import { exec, spawnSync } from 'child_process'
import util from 'util'
const execPromise = util.promisify(exec)

type ErrorCallback = (cmd: string, error: string, status: number | null) => void

export function runCommand(cmd: string, onError?: ErrorCallback): string | null {
    try {
        const [command, ...args] = cmd.split(' ')
        const result = spawnSync(command, args, { encoding: 'utf8' })

        if (result.status === 0) {
            return result.stdout?.trim() || ''
        } else {
            if (onError && typeof onError === 'function') {
                onError(cmd, result.stderr.trim(), result.status)
            }
            return null
        }
    } catch (error) {
        if (onError && typeof onError === 'function') {
            onError(cmd, error instanceof Error ? error.message : String(error), null)
        }
        return null
    }
}



export async function execWithErrorHandling(command: string): Promise<{ stdout: string }> {
    try {
        return await execPromise(command);
    } catch (error) {
        console.error(`Error executing "${command}":`, error);
        return { stdout: '' };
    }
}