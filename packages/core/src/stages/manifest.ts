import { promises as fs, lstatSync, readdirSync } from 'node:fs';
import * as path from 'node:path';
import { assertArtifactPath } from './artifact-path.js';
import type { Stage, BuildContext } from '../pipeline/pipeline.js';
import { generateFileHash } from '../utils/hash.js';

const MANIFEST_FILE = 'manifest.json';

interface ManifestEntry {
    size: number;
    hash: string;
}

/**
 * Generate the manifest for a site directory: walk it, hash every file, write
 * `<siteDir>/manifest.json`. Returns the manifest object. 1:1 with
 * `Manifest.generate`.
 */
export async function generate(siteDir: string): Promise<Record<string, ManifestEntry>> {
    if (lstatSync(siteDir).isSymbolicLink()) {
        throw new Error(`Manifest root cannot be a symbolic link: ${siteDir}`);
    }
    const manifest: Record<string, ManifestEntry> = Object.create(null);

    const scanDir = async (dirPath: string, basePath = ''): Promise<void> => {
        const items = readdirSync(dirPath);
        for (const item of items) {
            const fullPath = path.join(dirPath, item);
            if (item.includes('\\')) {
                throw new Error(`Manifest path contains a backslash: ${item}`);
            }
            const relativePath = path.join(basePath, item).split(path.sep).join('/');
            const stats = lstatSync(fullPath);
            if (stats.isSymbolicLink()) {
                throw new Error(`Manifest cannot include symbolic link: ${relativePath}`);
            }
            if (stats.isDirectory()) {
                await scanDir(fullPath, relativePath);
            } else if (!stats.isFile()) {
                throw new Error(`Manifest requires a regular file: ${relativePath}`);
            } else if (relativePath !== MANIFEST_FILE) {
                const hash = await generateFileHash(fullPath);
                manifest[relativePath] = { size: stats.size, hash };
            }
        }
    };

    await scanDir(siteDir);

    // Sort keys for deterministic output (1:1 with writeManifest).
    const sorted: Record<string, ManifestEntry> = Object.create(null);
    for (const key of Object.keys(manifest).sort()) {
        sorted[key] = manifest[key]!;
    }

    await assertArtifactPath(siteDir, path.join(siteDir, MANIFEST_FILE));
    await fs.writeFile(
        path.join(siteDir, MANIFEST_FILE),
        JSON.stringify(sorted, null, 2),
    );
    return sorted;
}

/**
 * Manifest stage. Writes `<outDir>/manifest.json`.
 */
export const manifestStage: Stage<BuildContext> = async (ctx: BuildContext): Promise<void> => {
    await generate(ctx.outDir);
};
