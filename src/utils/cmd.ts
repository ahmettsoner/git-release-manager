import { exec, spawnSync } from 'child_process'
import util from 'util'
const execPromise = util.promisify(exec)

// Node's default stdout buffer for exec/spawnSync is 1 MiB, and git output is
// not bounded by anything of the sort. Measured 2026-08-06 on a repository with
// large merge commits:
//
//   git log --pretty=format:"" --no-commit-id --name-only -r <sha>
//   → ERR_CHILD_PROCESS_STDIO_MAXBUFFER
//
// execWithErrorHandling below catches that, logs it and returns an EMPTY
// stdout — so the changelog rendered, exited 0, and silently omitted every
// changed file of the commit that overflowed. A truncated answer that reports
// success is worse than a failure, and the size at which it starts happening
// depends on the repository, so it appears only on the largest projects.
const MAX_STDIO_BUFFER = 256 * 1024 * 1024

type ErrorCallback = (cmd: string, error: string, status: number | null) => void

export function runCommand(cmd: string, onError?: ErrorCallback): string | null {
    try {
        const [command, ...args] = cmd.split(' ')
        const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: MAX_STDIO_BUFFER })

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
        return await execPromise(command, { maxBuffer: MAX_STDIO_BUFFER });
    } catch (error) {
        console.error(`Error executing "${command}":`, error);
        return { stdout: '' };
    }
}