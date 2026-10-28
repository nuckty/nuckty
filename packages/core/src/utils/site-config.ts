import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { getRoot } from './dir.js';

/** Shape of `config/site.json` after merging with defaults. */
export interface SiteConfig {
    baseUrl: string;
    rootTitle: string;
    contentRepo: string;
    assetRepos: string[];
    /** Explicit source paths for assets whose flat output filenames collide. */
    assetSources: Record<string, string>;
    githubRawBase: string | string[] | null;
    bundles: string[];
    /** Log file prefix used by the nginx config (e.g. `<prefix>_access.log`). */
    logPrefix: string;
    [k: string]: unknown;
}

const DEFAULTS: SiteConfig = {
    baseUrl: 'https://example.com',
    rootTitle: 'Site',
    contentRepo: 'content',
    assetRepos: [],
    assetSources: {},
    githubRawBase: null,
    bundles: [],
    logPrefix: 'nuckty',
};

/**
 * Load the merged site config for a given root. `from` may be any
 * path inside the project; the project root is discovered upward from it.
 *
 * `configDir` (RUNTIME-005): an explicit target config directory — when given,
 * `site.json` is read from THERE (absolute or root-relative), not from the
 * project root's `config/`. Each call reads the resolved directory, so
 * two targets with different configDirs load their own bundles/identity.
 */
export function loadConfig(from: string = process.cwd(), configDir?: string): SiteConfig {
    const root = getRoot(from);
    const dir = configDir !== undefined ? path.resolve(root, configDir) : path.join(root, 'config');
    const configPath = path.join(dir, 'site.json');
    let raw: string;
    try {
        raw = readFileSync(configPath, 'utf8');
    } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            if (process.env.NODE_ENV !== 'test') {
                console.warn(`Warning: could not load site config from ${configPath}: ${error.message}`);
            }
            return { ...DEFAULTS, assetRepos: [], assetSources: {}, bundles: [] };
        }

        throw error;
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(raw);
    } catch (error) {
        const position = error instanceof SyntaxError
            ? error.message.match(/\bposition (\d+)\b/)?.[1]
            : undefined;
        const location = position === undefined ? '' : ` at position ${position}`;
        throw new SyntaxError(`Invalid site config at ${configPath}: malformed JSON${location}`);
    }

    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error(`Invalid site config at ${configPath}: root must be a JSON object`);
    }

    const values = parsed as Record<string, unknown>;
    const stringFields = ['baseUrl', 'rootTitle', 'contentRepo', 'logPrefix'];
    for (const field of stringFields) {
        if (field in values && typeof values[field] !== 'string') {
            throw new Error(`Invalid site config at ${configPath}: "${field}" must be a string`);
        }
    }

    for (const field of ['assetRepos', 'bundles']) {
        const value = values[field];
        if (field in values && (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string'))) {
            throw new Error(`Invalid site config at ${configPath}: "${field}" must be an array of strings`);
        }
    }

    const githubRawBase = values.githubRawBase;
    if (
        'githubRawBase' in values && githubRawBase !== null && typeof githubRawBase !== 'string' &&
        (!Array.isArray(githubRawBase) || !githubRawBase.every((entry) => typeof entry === 'string'))
    ) {
        throw new Error(`Invalid site config at ${configPath}: "githubRawBase" must be a string, string array, or null`);
    }

    const assetSources = values.assetSources;
    if (
        'assetSources' in values &&
        (assetSources === null || typeof assetSources !== 'object' || Array.isArray(assetSources) ||
            !Object.values(assetSources).every((value) => typeof value === 'string'))
    ) {
        throw new Error(`Invalid site config at ${configPath}: "assetSources" must be an object of string values`);
    }

    return { ...DEFAULTS, assetRepos: [], assetSources: {}, bundles: [], ...values } as SiteConfig;
}

/** Backward-compatible reset; standalone accessors no longer cache. */
export function resetConfig(): void {
    // Compatibility API: configuration is now cached only in BuildContext.store.
}

export function getBaseUrl(from: string = process.cwd(), configDir?: string): string {
    return loadConfig(from, configDir).baseUrl;
}

export function getRootTitle(from: string = process.cwd(), configDir?: string): string {
    return loadConfig(from, configDir).rootTitle;
}

export function getContentRepo(from: string = process.cwd(), configDir?: string): string {
    return loadConfig(from, configDir).contentRepo;
}

export function getAssetRepos(from: string = process.cwd(), configDir?: string): string[] {
    return loadConfig(from, configDir).assetRepos;
}

export function getGithubRawBase(from: string = process.cwd(), configDir?: string): string | string[] | null {
    return loadConfig(from, configDir).githubRawBase;
}

export function getBundles(from: string = process.cwd(), configDir?: string): string[] {
    return loadConfig(from, configDir).bundles;
}
