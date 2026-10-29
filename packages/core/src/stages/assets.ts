import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { assertArtifactPath } from './artifact-path.js';
import type { Stage, BuildContext } from '../pipeline/pipeline.js';
import { getBuildConfig } from '../utils/build-config.js';
import { externalRepoName } from '../utils/external.js';
import { generateFileHash } from '../utils/hash.js';

/** Static config files copied verbatim into the site root. */
const CONFIG_FILES = ['robots.txt'];

/** Extensions of static asset files copied from external repos. */
const ASSET_EXTENSIONS = ['.pdf', '.zip', '.ini'];

interface AssetFile {
    filename: string;
    fullPath: string;
    relativePath: string;
}

function assetSourcePath(root: string, fullPath: string): string {
    return path.relative(root, fullPath).split(path.sep).join('/');
}

function selectAssetSources(
    root: string,
    candidates: Map<string, AssetFile[]>,
    configuredSources: Record<string, string>,
): AssetFile[] {
    const selected: AssetFile[] = [];

    for (const [filename, configuredPath] of Object.entries(configuredSources)) {
        if (path.isAbsolute(configuredPath) || configuredPath.split(/[\\/]/).includes('..')) {
            throw new Error(`Invalid asset source for "${filename}": path must be relative to the project root`);
        }
        const files = candidates.get(filename) ?? [];
        const match = files.find((file) => assetSourcePath(root, file.fullPath) === configuredPath);
        if (match === undefined) {
            throw new Error(`Configured asset source for "${filename}" does not match an available candidate: "${configuredPath}"`);
        }
    }

    for (const [filename, files] of candidates) {
        const configuredPath = configuredSources[filename];
        if (configuredPath !== undefined) {
            const match = files.find((file) => assetSourcePath(root, file.fullPath) === configuredPath);
            if (match === undefined) {
                throw new Error(`Configured asset source for "${filename}" does not match an available candidate: "${configuredPath}"`);
            }
            selected.push(match);
        } else if (files.length === 1) {
            selected.push(files[0]!);
        } else {
            const sources = files.map((file) => `"${file.fullPath}"`).join(' and ');
            throw new Error(`Asset filename collision: ${sources}`);
        }
    }

    return selected;
}

/** Resolve the external repos declared in `config/external.json` (mapped to
 *  `external/<name>/`), including repos absent on disk — so an absent repo is
 *  classified as `missing` rather than silently dropped. Falls back to the
 *  repos present under `external/` when `external.json` is absent (legacy
 *  discovery). A site's assets live in whichever repo carries them (docs,
 *  install, content), not only the content repo. */
async function resolveSourceRepos(root: string, urls: string[] | undefined): Promise<Array<{ name: string; path: string }>> {
    if (urls === undefined) {
        const external = path.join(root, 'external');
        try {
            const entries = await fs.readdir(external, { withFileTypes: true });

            return entries.filter(entry => entry.isDirectory() || entry.isSymbolicLink())
                .map(entry => ({ name: entry.name, path: path.join(external, entry.name) }));
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }
    return urls.map((url) => {
        const name = externalRepoName(url) || url;
        return { name, path: path.join(root, 'external', name) };
    });
}

/** Recursively find asset files (by extension) under a directory. */
async function findAssetFiles(dirPath: string, basePath = dirPath): Promise<AssetFile[]> {
    const results: AssetFile[] = [];
    let entries: import('node:fs').Dirent[];
    try {
        entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return results;
        }
        throw error;
    }
    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            const sub = await findAssetFiles(fullPath, basePath);
            for (const f of sub) results.push(f);
        } else if (
            entry.isFile() &&
            ASSET_EXTENSIONS.some((ext) => entry.name.endsWith(ext))
        ) {
            results.push({
                filename: entry.name,
                fullPath,
                relativePath: path.relative(basePath, fullPath),
            });
        }
    }
    return results;
}

/** Recursively find `.mp4` video files under a directory. */
async function findVideoFiles(basePath: string): Promise<Array<{ filename: string; fullPath: string }>> {
    const results: Array<{ filename: string; fullPath: string }> = [];
    let entries: import('node:fs').Dirent[];
    try {
        entries = await fs.readdir(basePath, { withFileTypes: true });
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return results;
        }
        throw error;
    }
    for (const entry of entries) {
        const fullPath = path.join(basePath, entry.name);
        if (entry.isDirectory()) {
            const sub = await findVideoFiles(fullPath);
            for (const f of sub) results.push(f);
        } else if (entry.isFile() && entry.name.endsWith('.mp4')) {
            results.push({ filename: entry.name, fullPath });
        }
    }
    return results;
}

/** Copy static config file (robots.txt) from config/ into site/. */
async function copyConfigFiles(configDir: string, siteDir: string): Promise<string[]> {
    const copied: string[] = [];
    await fs.mkdir(siteDir, { recursive: true });
    for (const filename of CONFIG_FILES) {
        const sourcePath = path.join(configDir, filename);
        const destPath = path.join(siteDir, filename);
        await assertArtifactPath(siteDir, destPath);
        try {
            await fs.access(sourcePath);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                continue;
            }
            throw error;
        }
        try {
            await fs.copyFile(sourcePath, destPath);
            copied.push(filename);
        } catch (error) {
            await fs.rm(destPath, { force: true });
            throw error;
        }
    }
    return copied;
}

/**
 * Assets stage. Copies external PDFs/ZIPs/INIs, MP4 videos (hashed), and static
 * config files into `ctx.outDir`. Stores available/missing repo info and the
 * video hash map in `ctx.store`.
 */
export const assetsStage: Stage<BuildContext> = async (ctx: BuildContext): Promise<void> => {
    const root = ctx.cwd;
    const configDir = path.resolve(root, ctx.configDir);
    const sourceRepos = await resolveSourceRepos(root, getBuildConfig(ctx).externalUrls);
    await assertArtifactPath(ctx.outDir);
    await fs.mkdir(ctx.outDir, { recursive: true });

    const available: string[] = [];
    const missing: string[] = [];
    const candidates = new Map<string, AssetFile[]>();
    const configuredSources = getBuildConfig(ctx).site.assetSources;

    for (const repo of sourceRepos) {
        // Repo access is separate from per-file copies: a repo that is present
        // on disk is `available` even if an individual file copy fails (a
        // per-file failure must not also push the repo into `missing`).
        let repoAccessible = true;
        try {
            await fs.access(repo.path);
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error;
            }
            repoAccessible = false;
        }
        if (!repoAccessible) {
            // A repo declared in external.json but absent on disk is recorded
            // as `missing`. resolveSourceRepos yields every declared repo
            // (including absent ones), so this branch is the normal path for an
            // absent repo (or a TOCTOU disappearance after enumeration).
            missing.push(repo.name);
            continue;
        }
        available.push(repo.name);

        // Defer copies until every configured source has been validated.
        const assetFiles = await findAssetFiles(repo.path);
        for (const fileInfo of assetFiles) {
            const files = candidates.get(fileInfo.filename) ?? [];
            files.push(fileInfo);
            candidates.set(fileInfo.filename, files);
        }

        for (const fileInfo of await findVideoFiles(repo.path)) {
            const files = candidates.get(fileInfo.filename) ?? [];

            files.push({ ...fileInfo, relativePath: assetSourcePath(root, fileInfo.fullPath) });
            candidates.set(fileInfo.filename, files);
        }
    }

    const selectedAssets = selectAssetSources(root, candidates, configuredSources);
    for (const fileInfo of selectedAssets) {
        if (fileInfo.filename.endsWith('.mp4')) {
            continue;
        }
        const destination = path.join(ctx.outDir, fileInfo.filename);
        await assertArtifactPath(ctx.outDir, destination);
        try {
            await fs.copyFile(fileInfo.fullPath, destination);
        } catch (error) {
            await fs.rm(destination, { force: true });
            throw error;
        }
    }

    // Copy MP4 videos with content-hash filenames.
    const videoHash: Record<string, string> =
        (ctx.store['videoHash'] as Record<string, string> | undefined) ?? {};
    for (const fileInfo of selectedAssets.filter((file) => file.filename.endsWith('.mp4'))) {
        try {
            const hash = await generateFileHash(fileInfo.fullPath);
            const ext = path.extname(fileInfo.filename);
            const hashedFilename = `${hash}${ext}`;
            await assertArtifactPath(ctx.outDir, path.join(ctx.outDir, hashedFilename));
            await fs.copyFile(fileInfo.fullPath, path.join(ctx.outDir, hashedFilename));
            videoHash[fileInfo.filename] = hashedFilename;
        } catch (error) {
            throw new Error(`Asset video copy failed for ${fileInfo.fullPath}: ${String(error)}`);
        }
    }
    ctx.store['videoHash'] = videoHash;

    // Copy static config files.
    await copyConfigFiles(configDir, ctx.outDir);

    ctx.store['assetRepos'] = { available, missing };
};

