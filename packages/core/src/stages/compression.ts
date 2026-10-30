import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import type { Dirent } from 'node:fs';
import { brotliCompress, constants, gzip } from 'node:zlib';
import { promisify } from 'node:util';
import { assertArtifactPath } from './artifact-path.js';
import type { Stage, BuildContext } from '../pipeline/pipeline.js';

const brotliCompressAsync = promisify(brotliCompress);
const gzipAsync = promisify(gzip);

const COMPRESSIBLE_EXTENSIONS = ['.html', '.css', '.js', '.svg', '.xml', '.txt'];
const SKIP_DIRS = new Set(['brotli', 'gzip']);

/** Collapses a relative path to its basename (flat compression layout). */
function getFlatFilename(file: string): string {
    return path.basename(file);
}

/** Text artifacts are compressed; binary images and downloads are not. */
function isCompressible(name: string): boolean {
    return COMPRESSIBLE_EXTENSIONS.includes(path.extname(name));
}

/** Recursively find compressible files under `siteDir`, skipping compression dirs. */
async function findCompressibleFiles(siteDir: string): Promise<string[]> {
    const files: string[] = [];

    async function walk(dir: string): Promise<void> {
        let entries: Dirent[];
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch (error) {
            throw new Error(`Cannot enumerate artifact directory ${dir}: ${String(error)}`);
        }
        await Promise.all(entries.map(async (entry) => {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.relative(siteDir, fullPath);

            // Skip the compression output directories entirely.
            const top = relativePath.split(path.sep)[0];
            if (top && SKIP_DIRS.has(top)) {
                return;
            }

            if (entry.isDirectory()) {
                await walk(fullPath);
                return;
            }
            if (!entry.isFile()) {
                throw new Error(`Compression requires regular artifact files: ${relativePath}`);
            }
            // robots.txt is too small to benefit from compression.
            if (entry.name === 'robots.txt') {
                return;
            }
            if (isCompressible(entry.name)) {
                files.push(relativePath);
            }
        }));
    }

    await walk(siteDir);
    return files;
}

/** Compress one file into brotli/gzip (always). */
async function compressFile(file: string, siteDir: string): Promise<void> {
    const sourcePath = path.join(siteDir, file);
    const content = await fs.readFile(sourcePath);
    if (content.length === 0) {
        return;
    }

    const flatFilename = getFlatFilename(file);

    const brotli = await compressBrotliQuality11(content);
    const gz = await compressGzipLevel9(content);

    const brotliPath = path.join(siteDir, 'brotli', `${flatFilename}.br`);
    const gzipPath = path.join(siteDir, 'gzip', `${flatFilename}.gz`);

    await assertArtifactPath(siteDir, brotliPath);
    await assertArtifactPath(siteDir, gzipPath);
    await fs.mkdir(path.dirname(brotliPath), { recursive: true });
    await fs.mkdir(path.dirname(gzipPath), { recursive: true });

    await Promise.all([
        fs.writeFile(brotliPath, brotli),
        fs.writeFile(gzipPath, gz),
    ]);
}

/** Brotli at quality 11 (maximum). */
async function compressBrotliQuality11(content: Buffer): Promise<Buffer> {
    return (await brotliCompressAsync(content, {
        params: { [constants.BROTLI_PARAM_QUALITY]: 11 },
    })) as Buffer;
}

/** Gzip at level 9, OS byte (byte 9) normalized to 0xFF for determinism. */
async function compressGzipLevel9(content: Buffer): Promise<Buffer> {
    const out = (await gzipAsync(content, { level: 9 })) as Buffer;
    // Normalize OS byte (index 9) to 0xFF (unknown) for cross-platform determinism.
    // Different OS markers change compressed hashes and can cause unnecessary
    // uploads between build hosts; the manifest still describes its own bytes.
    out[9] = 0xff;
    return out;
}

/**
 * Compression stage. Compresses every compressible file in `ctx.outDir` into
 * `brotli/` and `gzip/` subdirectories.
 */
export const compressionStage: Stage<BuildContext> = async (ctx: BuildContext): Promise<void> => {
    await assertArtifactPath(ctx.outDir, path.join(ctx.outDir, 'brotli'));
    await assertArtifactPath(ctx.outDir, path.join(ctx.outDir, 'gzip'));
    await fs.mkdir(path.join(ctx.outDir, 'brotli'), { recursive: true });
    await fs.mkdir(path.join(ctx.outDir, 'gzip'), { recursive: true });

    const files = (await findCompressibleFiles(ctx.outDir)).sort();
    const sources = new Map<string, string>();
    for (const file of files) {
        const basename = getFlatFilename(file);
        const previous = sources.get(basename);
        if (previous !== undefined) {
            throw new Error(`Compression filename collision: "${previous}" and "${file}" both use "${basename}"`);
        }
        sources.set(basename, file);
    }
    for (const file of files) {
        await compressFile(file, ctx.outDir);
    }
};
