/** Validate every destructive output path before the first clean. */
import path from 'node:path';
import { realpathSync, lstatSync, statSync } from 'node:fs';

const PROTECTED_INPUT_DIRS = ['config', 'content', 'blocks', 'external', 'src', 'lib', 'openspec'] as const;
const PROTECTED_RUNTIME_DIRS = ['.git', '.github', 'node_modules'] as const;

export class UnsafeOutDirError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UnsafeOutDirError';
    }
}

interface OutputTarget {
    name: string;
    outDir: string;
    configDir?: string;
}

/** Resolve existing ancestors too, so a missing child below a symlink is checked. */
function canonicalPath(input: string): string {
    const absolute = path.resolve(input);
    try {
        return realpathSync(absolute);
    } catch (error) {
        if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
            throw error;
        }
        // A dangling link cannot be treated as a harmless missing directory.
        try {
            if (lstatSync(absolute).isSymbolicLink()) {
                throw new UnsafeOutDirError(`nuckty: dangling output/input symlink "${absolute}"`);
            }
        } catch (statError) {
            if (!(statError instanceof Error) || !('code' in statError) || statError.code !== 'ENOENT') {
                throw statError;
            }
        }
        const parent = path.dirname(absolute);
        if (parent === absolute) {
            throw error;
        }
        return path.join(canonicalPath(parent), path.basename(absolute));
    }
}

function contains(parent: string, child: string): boolean {
    const relative = path.relative(parent, child);
    return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

function overlaps(left: string, right: string): boolean {
    return contains(left, right) || contains(right, left);
}

function isDirectoryOrMissing(input: string): boolean {
    try {
        return statSync(input).isDirectory();
    } catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
            return true;
        }
        if (error instanceof Error && 'code' in error && error.code === 'ENOTDIR') {
            return false;
        }
        throw error;
    }
}

/** Inputs include target config directories and resolved consumer/extension levels. */
export function preflightOutDirs(cwd: string, targets: ReadonlyArray<OutputTarget>, inputs: readonly string[] = []): void {
    const root = canonicalPath(cwd);
    const protectedPaths = [
        ...PROTECTED_INPUT_DIRS,
        ...PROTECTED_RUNTIME_DIRS,
        ...targets.flatMap((target) => target.configDir ? [target.configDir] : []),
        ...inputs,
    ].map((input) => canonicalPath(path.resolve(cwd, input)));
    const buildLexical = path.resolve(cwd, '.build');
    if (!isDirectoryOrMissing(buildLexical)) {
        throw new UnsafeOutDirError('nuckty: .build exists and is not a directory — refusing to clean it');
    }
    const buildDir = canonicalPath(buildLexical);
    const outputs: Array<{ name: string; absolute: string }> = [];

    for (const target of targets) {
        const lexical = path.resolve(cwd, target.outDir);
        if (!isDirectoryOrMissing(lexical)) {
            throw new UnsafeOutDirError(`nuckty: target "${target.name}" outDir "${target.outDir}" exists and is not a directory — refusing to clean it`);
        }
        const absolute = canonicalPath(lexical);
        if (!target.outDir || path.isAbsolute(target.outDir) || lexical === path.resolve(cwd) || !contains(path.resolve(cwd), lexical) || absolute === root || !contains(root, absolute)) {
            throw new UnsafeOutDirError(`nuckty: target "${target.name}" outDir "${target.outDir}" is not a subdirectory of the consumer root`);
        }
        if (protectedPaths.some((input) => overlaps(input, absolute)) || overlaps(buildDir, absolute)) {
            throw new UnsafeOutDirError(`nuckty: target "${target.name}" outDir "${target.outDir}" overlaps an input or build directory — refusing to clean it`);
        }
        const previous = outputs.find((output) => overlaps(output.absolute, absolute));
        if (previous) {
            throw new UnsafeOutDirError(`nuckty: targets "${previous.name}" and "${target.name}" have overlapping outDirs — refusing to clean them`);
        }
        outputs.push({ name: target.name, absolute });
    }
    if (buildDir === root || !contains(root, buildDir) || protectedPaths.some((input) => overlaps(input, buildDir))) {
        throw new UnsafeOutDirError('nuckty: .build overlaps an input or leaves the consumer root — refusing to clean it');
    }
}
