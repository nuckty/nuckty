import { readFileSync } from 'node:fs';
import * as path from 'node:path';

/** Shape of `config/site.json` after merging with defaults. */
export interface SiteConfig {
    baseUrl: string;
    rootTitle: string;
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
    assetSources: {},
    githubRawBase: null,
    bundles: [],
    logPrefix: 'nuckty',
};

/** Load `site.json` from a target configuration directory and merge it with the defaults. */
export function loadSiteConfig(configDir: string): SiteConfig {
    const configPath = path.join(configDir, 'site.json');
    let raw: string;
    try {
        raw = readFileSync(configPath, 'utf8');
    } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            console.warn(`Warning: could not load site config from ${configPath}: ${error.message}`);
            return { ...DEFAULTS, assetSources: {}, bundles: [] };
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
    const stringFields = ['baseUrl', 'rootTitle', 'logPrefix'];
    for (const field of stringFields) {
        if (field in values && typeof values[field] !== 'string') {
            throw new Error(`Invalid site config at ${configPath}: "${field}" must be a string`);
        }
    }

    for (const field of ['bundles']) {
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

    return { ...DEFAULTS, assetSources: {}, bundles: [], ...values } as SiteConfig;
}
