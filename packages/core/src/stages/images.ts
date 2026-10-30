import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { Dirent } from 'node:fs';
import { assertArtifactPath, resolveBuildFile } from './artifact-path.js';
import type { Stage, BuildContext } from '../pipeline/pipeline.js';
import { getBuildConfig } from '../utils/build-config.js';
import { generateHash } from '../utils/hash.js';
import { isToolingDirectory } from '../utils/walk.js';
import type { ImageStatEntry } from './types.js';

const SUPPORTED_FORMATS = ['.png', '.jpg', '.jpeg', '.gif', '.webp'];
const SVG_FORMAT = '.svg';

interface ImageBuilderState {
    imageList: string[];
    imageMapping: Map<string, string>;
    hashToFilename: Map<string, string>;
    imageStats: Map<string, ImageStatEntry>;
    sourceDirs: string[];
    buildDir: string;
    outDir: string;
}

/**
 * Images stage. Scans levels and hashes/copies originals with prepared format
 * variants, then stores the mapping in `ctx.store.imageMapping`.
 */
export const imagesStage: Stage<BuildContext> = async (ctx: BuildContext): Promise<void> => {
    const root = ctx.cwd;
    const configuredLevels = getBuildConfig(ctx).levels;
    const registeredLevels = ctx.env.levels.list();
    const levels = registeredLevels.length > 0 ? registeredLevels : configuredLevels;
    const sourceDirs = levels.map((level) => path.resolve(root, level));

    const state: ImageBuilderState = {
        imageList: [],
        imageMapping: new Map(),
        hashToFilename: new Map(),
        imageStats: new Map(),
        sourceDirs,
        buildDir: ctx.buildDir,
        outDir: ctx.outDir,
    };

    await ensureOutputDirs(state);

    // Later levels override earlier levels, independent of filesystem timing.
    const selected = new Map<string, { file: string; sourceDir: string }>();
    for (const sourceDir of sourceDirs) {
        state.imageList = [];
        await collectImagePaths(sourceDir, state);
        for (const file of state.imageList.sort()) {
            selected.set(path.relative(sourceDir, file), { file, sourceDir });
        }
    }
    for (const { file, sourceDir } of selected.values()) {
        await processImage(file, sourceDir, state);
    }

    // 3. Write mapping file + store artifacts.
    await fs.writeFile(
        await resolveBuildFile(state.buildDir, 'image-mapping.json'),
        JSON.stringify(Object.fromEntries(state.imageMapping), null, 2),
    );

    const mapping: Record<string, string> = Object.fromEntries(state.imageMapping);
    const stats: Record<string, ImageStatEntry> = Object.fromEntries(state.imageStats);
    ctx.store.imageMapping = mapping;
    ctx.store.imageStats = stats;
};

async function ensureOutputDirs(state: ImageBuilderState): Promise<void> {
    const dirs = [
        state.buildDir,
        state.outDir,
        path.join(state.outDir, 'png'),
        path.join(state.outDir, 'jpg'),
        path.join(state.outDir, 'avif'),
        path.join(state.outDir, 'webp'),
        path.join(state.outDir, 'svg'),
    ];
    for (const d of dirs) {
        if (d !== state.buildDir) {
            await assertArtifactPath(state.outDir, d);
        }
        await fs.mkdir(d, { recursive: true });
    }
}

/** Recursively collect supported image paths outside hidden and dependency directories. */
async function collectImagePaths(dirPath: string, state: ImageBuilderState): Promise<void> {
    let entries: Dirent[];
    try {
        entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            return;
        }
        throw error;
    }
    await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            if (isToolingDirectory(entry.name)) {
                return;
            }
            await collectImagePaths(fullPath, state);
            return;
        }
        if (!entry.isFile()) {
            return;
        }
        const ext = path.extname(entry.name).toLowerCase();
        if (SUPPORTED_FORMATS.includes(ext) || ext === SVG_FORMAT) {
            state.imageList.push(fullPath);
        }
    }));
}

/** Determine the output subdirectory for an image extension. */
function outputSubdirFor(ext: string, outDir: string): string {
    if (ext === SVG_FORMAT) {
        return path.join(outDir, 'svg');
    }
    if (ext === '.png') {
        return path.join(outDir, 'png');
    }
    if (ext === '.jpg' || ext === '.jpeg') {
        return path.join(outDir, 'jpg');
    }
    if (ext === '.webp') {
        return path.join(outDir, 'webp');
    }
    return outDir;
}

/** Process a single image: hash, copy, register mapping, copy modern variants. */
async function processImage(imagePath: string, sourceDir: string, state: ImageBuilderState): Promise<void> {
    const relativePath = path.relative(sourceDir, imagePath);
    const sourceRoot = await fs.realpath(sourceDir);
    const imageBuffer = await readImageSource(imagePath, sourceRoot);
    const ext = path.extname(imagePath).toLowerCase();
    const isSvg = ext === SVG_FORMAT;
    const variants = new Map<string, Buffer>();
    if (!isSvg) {
        for (const format of ['avif', 'webp']) {
            const variantPath = path.join(path.dirname(imagePath), `${path.basename(imagePath, path.extname(imagePath))}.${format}`);
            if (variantPath === imagePath) {
                continue;
            }
            try {
                variants.set(format, await readImageSource(variantPath, sourceRoot));
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                    throw error;
                }
            }
        }
    }
    // The public reference identifies every representation served for this URL.
    const hash = isSvg ? generateHash(imageBuffer) : generateHash(Buffer.concat([
        Buffer.from(`${ext}\0${imageBuffer.length}\0`), imageBuffer,
        ...Array.from(variants, ([format, bytes]) => Buffer.concat([
            Buffer.from(`${format}\0${bytes.length}\0`), bytes,
        ])),
    ]));
    const imageRef = isSvg ? `${hash}.svg` : `_i${hash}`;
    const hashedFilename = `${hash}${ext}`;

    if (!state.hashToFilename.has(hash)) {
        const outputSubdir = outputSubdirFor(ext, state.outDir);
        await fs.mkdir(outputSubdir, { recursive: true });
        await assertArtifactPath(state.outDir, path.join(outputSubdir, hashedFilename));
        await fs.writeFile(path.join(outputSubdir, hashedFilename), imageBuffer);
        for (const [format, bytes] of variants) {
            await assertArtifactPath(state.outDir, path.join(state.outDir, format, `${hash}.${format}`));
            await fs.writeFile(path.join(state.outDir, format, `${hash}.${format}`), bytes);
        }
        state.imageStats.set(hashedFilename, {
            source: relativePath,
            size: imageBuffer.length,
            hash,
            ref: imageRef,
            format: ext.substring(1),
            avif: variants.has('avif'),
            webp: variants.has('webp') || ext === '.webp',
        });
        state.hashToFilename.set(hash, hashedFilename);
    }
    state.imageMapping.set(relativePath, imageRef);
}

/** Verify original and variant aliases before reading representation bytes. */
async function readImageSource(file: string, sourceRoot: string): Promise<Buffer> {
    const resolved = await fs.realpath(file);
    const relative = path.relative(sourceRoot, resolved);

    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw new Error(`Image source escapes image source level: ${path.basename(file)}`);
    }

    return fs.readFile(resolved);
}
