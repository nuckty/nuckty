import { execFile } from 'node:child_process';
import { existsSync, statSync, accessSync, constants } from 'node:fs';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const inFlight = new Map<string, Promise<number | null>>();

const IS_WIN = process.platform === 'win32';

/**
 * Search nonempty PATH entries for git, then git.exe. POSIX candidates must be
 * executable regular files; the Windows policy checks only regular files.
 * Returns the matching path, or bare git for execFile's runtime PATH lookup
 * when no candidate is found. No shell is involved.
 *
 * readTimestamp caches the selected binary. This helper is stateless; injected
 * envPath, delimiter and isWin allow policy tests without changing process.env
 * or claiming a native Windows run.
 */
export function resolveGitBin(
    envPath: string = process.env.PATH ?? '',
    delimiter: string = path.delimiter,
    isWin: boolean = IS_WIN,
): string {
    for (const dir of envPath.split(delimiter)) {
        if (!dir) {
            continue;
        }
        for (const name of ['git', 'git.exe']) {
            const candidate = path.join(dir, name);
            if (isExecutableFile(candidate, isWin)) {
                return candidate;
            }
        }
    }
    return 'git';
}

/**
 * A candidate is usable when it exists, is a regular file (not a directory),
 * and is executable. On Windows the POSIX execute bit is not an execute
 * proxy, so any regular file is accepted without `X_OK`. On POSIX, both `git`
 * and `git.exe` must pass `accessSync(X_OK)`.
 */
function isExecutableFile(p: string, isWin: boolean): boolean {
    try {
        if (!existsSync(p)) {
            return false;
        }
        if (!statSync(p).isFile()) {
            return false;
        }
        if (isWin) {
            return true;
        }
        accessSync(p, constants.X_OK);
        return true;
    } catch {
        return false;
    }
}

let gitBin: string | null = null;

/**
 * Read the file's own Git history. Git discovers the nearest repository from
 * the file directory; consumer cwd and external repo name prefixes are irrelevant.
 * An explicit repo keeps the existing caller override. Relative file paths are
 * resolved against that override, or the current directory when it is absent.
 * Standalone calls deduplicate only in-flight requests. A build may pass its own
 * cache to retain completed results until that build finishes.
 */
export function getFileTimestamp(
    filePath: string,
    repoPath?: string,
    cache?: Map<string, Promise<number | null>>,
): Promise<number | null> {
    const absolute = path.resolve(repoPath ?? process.cwd(), filePath);
    const gitRepo = repoPath ? path.resolve(repoPath) : path.dirname(absolute);
    const queryPath = path.relative(gitRepo, absolute);
    const key = `${gitRepo}::${queryPath}`;
    const requests = cache ?? inFlight;
    const cached = requests.get(key);

    if (cached) {
        return cached;
    }
    const pending = readTimestamp(gitRepo, queryPath);
    requests.set(key, pending);
    if (!cache) {
        void pending.finally(() => {
            if (inFlight.get(key) === pending) {
                inFlight.delete(key);
            }
        });
    }
    return pending;
}

async function readTimestamp(gitRepo: string, queryPath: string): Promise<number | null> {
    try {
        const { stdout } = await execFileAsync(gitBin ?? (gitBin = resolveGitBin()), ['--literal-pathspecs', 'log', '-1', '--format=%ct', '--', queryPath], {
            cwd: gitRepo,
            maxBuffer: 1024 * 1024,
        });
        const trimmed = stdout.trim();
        if (!trimmed) {
            return null;
        }
        const timestamp = Number.parseInt(trimmed, 10);
        return Number.isFinite(timestamp) ? timestamp : null;
    } catch {
        return null;
    }
}

/** Backward-compatible reset for standalone in-flight requests. */
export function resetTimestampCache(): void {
    inFlight.clear();
}

/**
 * Format a Unix timestamp (seconds) the way build-html.js rendered
 * `lastUpdated`: shift +3 hours, then print `DD.MM.YYYY HH:MM GMT+03`.
 */
export function formatLastUpdated(unixSeconds: number): string {
    const date = new Date(unixSeconds * 1000);
    // Add 3 hours to UTC, then read UTC components (1:1 with legacy).
    const gmt3 = new Date(date.getTime() + 3 * 60 * 60 * 1000);
    const day = String(gmt3.getUTCDate()).padStart(2, '0');
    const month = String(gmt3.getUTCMonth() + 1).padStart(2, '0');
    const year = gmt3.getUTCFullYear();
    const hours = String(gmt3.getUTCHours()).padStart(2, '0');
    const minutes = String(gmt3.getUTCMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes} GMT+03`;
}

