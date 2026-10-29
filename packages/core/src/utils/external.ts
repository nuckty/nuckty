/** Entries of `config/external.json`: a repository URL string or a pinned, optionally partial source. */

/** One external content repository. `ref` pins a tag or commit; `path` limits the working copy to one subdirectory. */
export interface ExternalSource {
    url: string;
    ref?: string;
    path?: string;
}

const KEYS = new Set(['url', 'ref', 'path']);
const REF = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const SEGMENT = /^[A-Za-z0-9._+-]+$/;

function invalid(file: string, index: number, reason: string): Error {
    return new Error(`nuckty: ${file} entry ${index + 1}: ${reason}`);
}

function validRef(ref: string): boolean {
    return REF.test(ref) && !ref.includes('..') && !ref.includes('//') && !ref.endsWith('/') && !ref.endsWith('.lock');
}

function validPath(value: string): boolean {
    return value.split('/').every((segment) => SEGMENT.test(segment) && segment !== '.' && segment !== '..' && !segment.startsWith('-'));
}

/**
 * Directory name of an external repository under `external/`: the last path segment of the URL without `.git`,
 * after the host of an SSH scp URL. `git@host:acme/content.git` and `https://host/acme/content` both give `content`.
 */
export function externalRepoName(url: string): string {
    const withoutSuffix = url.replace(/\.git$/, '');
    const colon = withoutSuffix.lastIndexOf(':');
    const repositoryPath = colon >= 0 ? withoutSuffix.slice(colon + 1) : withoutSuffix;

    return repositoryPath.split('/').pop() ?? '';
}

/**
 * Validate parsed `external.json` content. A string entry is a repository URL; an object entry has a
 * required `url`, an optional `ref` (tag or commit) and an optional `path` (relative subdirectory).
 */
export function parseExternalSources(value: unknown, file = 'config/external.json'): ExternalSource[] {
    if (!Array.isArray(value)) {
        throw new Error(`nuckty: ${file} must contain an array of repository URLs or source objects`);
    }

    return value.map((entry: unknown, index): ExternalSource => {
        if (typeof entry === 'string') {
            if (!entry) {
                throw invalid(file, index, 'url must not be empty');
            }

            return { url: entry };
        }
        if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
            throw invalid(file, index, 'expected a URL string or an object with url, ref and path');
        }

        const record = entry as Record<string, unknown>;
        const unknownKey = Object.keys(record).find((key) => !KEYS.has(key));

        if (unknownKey !== undefined) {
            throw invalid(file, index, `unknown field ${JSON.stringify(unknownKey)}`);
        }
        if (typeof record['url'] !== 'string' || !record['url']) {
            throw invalid(file, index, 'url must be a non-empty string');
        }

        const source: ExternalSource = { url: record['url'] };

        if (record['ref'] !== undefined) {
            if (typeof record['ref'] !== 'string' || !validRef(record['ref'])) {
                throw invalid(file, index, 'ref must be a tag or commit name');
            }
            source.ref = record['ref'];
        }
        if (record['path'] !== undefined) {
            if (typeof record['path'] !== 'string' || !validPath(record['path'])) {
                throw invalid(file, index, 'path must be a relative subdirectory of letters, digits, ., _, + and - without . or .. segments');
            }
            source.path = record['path'];
        }

        return source;
    });
}
