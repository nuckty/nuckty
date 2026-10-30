/** Reject existing links in an artifact destination before reading or writing it. */
import { lstat, realpath } from 'node:fs/promises';
import path from 'node:path';

export async function assertArtifactPath(root: string, destination = root): Promise<void> {
    const relative = path.relative(root, destination);
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
        throw new Error(`Artifact destination escapes output: ${destination}`);
    }
    let current = path.resolve(root);
    const parts = relative ? relative.split(path.sep) : [];
    for (let index = 0; index <= parts.length; index += 1) {
        if (index > 0) {
            current = path.join(current, parts[index - 1]!);
        }
        try {
            const stats = await lstat(current);
            if (stats.isSymbolicLink()) {
                throw new Error(`Artifact path cannot be a symbolic link: ${current}`);
            }
            if (index < parts.length && !stats.isDirectory()) {
                throw new Error(`Artifact parent must be a directory: ${current}`);
            }
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
                throw error;
            }
        }
    }
}
/** Resolve owned metadata before both reads and writes, retaining symbolic build roots. */
export async function resolveBuildFile(buildDir: string, filename: string): Promise<string> {
    const workspace = await realpath(buildDir);
    const destination = path.resolve(workspace, filename);

    await assertArtifactPath(workspace, destination);

    return destination;
}
