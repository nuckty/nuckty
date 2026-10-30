/** Configuration captured once per target build, never shared between builds. */
import path from 'node:path';
import { readFileSync } from 'node:fs';
import type { BuildContext } from '../pipeline/pipeline.js';
import { loadSiteConfig, type SiteConfig } from './site-config.js';
import { externalRepoName, parseExternalSources } from './external.js';

export interface BuildConfigSnapshot {
    site: SiteConfig;
    levels: string[];
    contentDir: string;
    contentRelative: string;
    externalUrls: string[] | undefined;
}

function readStrings(file: string, fallback: string[] | undefined): string[] | undefined {
    try {
        const value: unknown = JSON.parse(readFileSync(file, 'utf8'));
        if (!Array.isArray(value) || !value.every((entry): entry is string => typeof entry === 'string')) {
            throw new Error(`nuckty: ${file} must contain an array of strings`);
        }
        return value;
    } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return fallback;
        }
        throw error;
    }
}

function readExternalUrls(file: string): string[] | undefined {
    let value: unknown;

    try {
        value = JSON.parse(readFileSync(file, 'utf8'));
    } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return undefined;
        }
        throw error;
    }

    return parseExternalSources(value, file).map((source) => source.url);
}

export function loadBuildConfig(cwd: string, configDir: string): BuildConfigSnapshot {
    const directory = path.resolve(cwd, configDir);
    const levels = readStrings(path.join(directory, 'levels.json'), ['content', 'blocks'])!;
    const contentDir = path.resolve(cwd, levels[0] ?? 'content');
    const externalUrls = readExternalUrls(path.join(directory, 'external.json'));

    for (const [index, url] of (externalUrls ?? []).entries()) {
        try {
            externalRepoName(url);
        } catch (error) {
            throw new Error(`nuckty: ${path.join(directory, 'external.json')} entry ${index + 1}: ${(error as Error).message}`, { cause: error });
        }
    }
    return {
        site: loadSiteConfig(directory),
        levels,
        contentDir,
        contentRelative: `./${path.relative(cwd, contentDir).split(path.sep).join('/')}/`,
        externalUrls,
    };
}

export function getBuildConfig(ctx: Pick<BuildContext, 'cwd' | 'configDir' | 'store'>): BuildConfigSnapshot {
    const existing = ctx.store.configSnapshot;
    if (existing) {
        return existing;
    }
    const snapshot = loadBuildConfig(ctx.cwd, ctx.configDir);
    ctx.store.configSnapshot = snapshot;
    return snapshot;
}
