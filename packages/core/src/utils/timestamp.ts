import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Unix time in seconds of the last commit that touched `file`, or null when the
 * file is untracked or Git is unavailable. Git discovers the repository from
 * the file directory. Results are shared through `cache` for one build.
 */
export function getFileTimestamp(file: string, cache: Map<string, Promise<number | null>>): Promise<number | null> {
    const cached = cache.get(file);

    if (cached) {
        return cached;
    }
    const pending = readTimestamp(file);

    cache.set(file, pending);

    return pending;
}

async function readTimestamp(file: string): Promise<number | null> {
    try {
        const { stdout } = await execFileAsync('git', ['--literal-pathspecs', 'log', '-1', '--format=%ct', '--', path.basename(file)], {
            cwd: path.dirname(file),
            maxBuffer: 1024 * 1024,
        });
        const timestamp = Number.parseInt(stdout.trim(), 10);

        return Number.isFinite(timestamp) ? timestamp : null;
    } catch {
        return null;
    }
}
