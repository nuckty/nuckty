import { accessSync, readdirSync, existsSync, statSync, readFileSync } from 'node:fs';
import { promises as fs, type Dirent } from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';

/**
 * Read current `config/levels.json` for standalone directory accessors.
 */
function readLevels(root: string): ReadonlyArray<string> {
    const levelsPath = path.join(root, 'config', 'levels.json');
    let frozen: ReadonlyArray<string>;
    try {
        const raw = JSON.parse(readFileSync(levelsPath, 'utf8')) as string[];
        frozen = Object.freeze([...raw]);
    } catch {
        frozen = Object.freeze(['content', 'blocks']);
    }
    return frozen;
}

/** Backward-compatible reset; standalone accessors no longer cache. */
export function resetLevelsCache(): void {
    // Compatibility API: standalone directory accessors read current levels.
}

/**
 * Walk upward from `from` (default: process.cwd()) to the nearest directory
 * containing `package.json`. Mirrors `Dir.getRoot()` in the original module.
 * Falls back to `from` if none is found.
 */
export function getRoot(from: string = process.cwd()): string {
    let current = path.resolve(from);
    const root = path.parse(current).root;
    while (current !== root) {
        try {
            accessSync(path.join(current, 'package.json'));
            return current;
        } catch {
            current = path.dirname(current);
        }
    }
    // Last chance: the root itself.
    try {
        accessSync(path.join(current, 'package.json'));
        return current;
    } catch {
        return path.resolve(from);
    }
}

/** `<root>/.build`. */
export function getBuild(root: string = process.cwd()): string {
    return path.join(getRoot(root), '.build');
}

/** `<root>/site`. */
export function getSite(root: string = process.cwd()): string {
    return path.join(getRoot(root), 'site');
}

/** `<levels[0]>` resolved under root — the primary content directory. */
export function getContent(root: string = process.cwd()): string {
    const r = getRoot(root);
    const levels = readLevels(r);
    return path.join(r, levels[0] ?? 'content');
}

/** `<site>/html`. */
export function getSiteHtml(root: string = process.cwd()): string {
    return path.join(getSite(root), 'html');
}

/** `<site>/brotli`. */
export function getSiteBrotli(root: string = process.cwd()): string {
    return path.join(getSite(root), 'brotli');
}

/** `<site>/gzip`. */
export function getSiteGzip(root: string = process.cwd()): string {
    return path.join(getSite(root), 'gzip');
}

/** `<build>/<filename>`. */
export function getBuildFile(filename: string, root: string = process.cwd()): string {
    return path.join(getBuild(root), filename);
}

/**
 * External content directory (the primary content root). Resolved from
 * `levels[0]` so the same path serves both `content/` and `external/<repo>/`.
 * 1:1 with `Dir.getExternalContent()`.
 */
export function getExternalContent(root: string = process.cwd()): string {
    return getContent(root);
}

/**
 * Standalone discovery under the nearest package root. Returns existing paths
 * from config/external.json; when none are available, discovers external/
 * directories and symlinks. Build stages use their target snapshot instead.
 */
export function getExternalRepoDirs(root: string = process.cwd()): string[] {
    const r = getRoot(root);
    const externalDir = path.join(r, 'external');
    let names: string[] = [];
    try {
        const raw = readFileSync(path.join(r, 'config', 'external.json'), 'utf8');
        const urls = JSON.parse(raw) as string[];
        names = urls.map((url) => url.replace(/\.git$/, '').split('/').pop() ?? url);
    } catch {
        // no external.json — fall back to whatever external/ contains.
    }
    const dirs: string[] = [];
    for (const name of names) {
        const p = path.join(externalDir, name);
        if (existsSync(p)) dirs.push(p);
    }
    if (dirs.length === 0) {
        // No external.json (or none present): scan external/ subdirs directly.
        try {
            for (const e of readdirSync(externalDir, { withFileTypes: true })) {
                if (e.isDirectory() || e.isSymbolicLink()) {
                    const p = path.join(externalDir, e.name);
                    if (existsSync(p)) dirs.push(p);
                }
            }
        } catch {
            // external/ missing — no repo dirs.
        }
    }
    return dirs;
}

/**
 * Relative content-root prefix used in page.inputPath and markdown link
 * rewriting (e.g. `./external/<repo>/` or `./content/`). Trailing slash
 * included. 1:1 with `Dir.getExternalContentRelative()`.
 */
export function getExternalContentRelative(root: string = process.cwd()): string {
    const r = getRoot(root);
    const levels = readLevels(r);
    const first = (levels[0] ?? 'content').replace(/\/+$/, '');
    return `./${first}/`;
}

/** Ensure a directory exists, creating it (and parents) if missing. */
export async function ensure(dirPath: string): Promise<void> {
    try {
        await fs.access(dirPath);
    } catch {
        await fs.mkdir(dirPath, { recursive: true });
    }
}

/**
 * Recursively scan a directory for files with the given extensions.
 * - `extensions: []` includes every file.
 * - Directories whose name starts with `.` or is listed in `excludeDirs` are
 *   skipped (matching the original).
 */
export async function scan(
    dirPath: string,
    extensions: ReadonlyArray<string> = [],
    excludeDirs: ReadonlyArray<string> = [],
): Promise<string[]> {
    const files: string[] = [];
    let entries: Dirent[];
    try {
        entries = await fs.readdir(dirPath, { withFileTypes: true });
    } catch {
        // Directory access errors are swallowed, mirroring the original.
        return files;
    }
    await Promise.all(entries.map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            if (excludeDirs.includes(entry.name) || entry.name.startsWith('.')) return;
            const sub = await scan(fullPath, extensions, excludeDirs);
            for (const f of sub) files.push(f);
            return;
        }
        if (!entry.isFile()) return;
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.length === 0 || extensions.includes(ext)) files.push(fullPath);
    }));
    return files;
}

/**
 * Standalone facade binding directory accessors to a starting path. Accessors
 * discover the nearest package root; build stages use BuildContext.cwd directly.
 */
export class Dir {
    private readonly root: string;
    constructor(root: string = process.cwd()) {
        this.root = root;
    }

    getRoot(): string { return getRoot(this.root); }
    getBuild(): string { return getBuild(this.root); }
    getSite(): string { return getSite(this.root); }
    getContent(): string { return getContent(this.root); }
    getSiteHtml(): string { return getSiteHtml(this.root); }
    getSiteBrotli(): string { return getSiteBrotli(this.root); }
    getSiteGzip(): string { return getSiteGzip(this.root); }
    getBuildFile(filename: string): string { return getBuildFile(filename, this.root); }
    getExternalContent(): string { return getExternalContent(this.root); }
    getExternalContentRelative(): string { return getExternalContentRelative(this.root); }

    ensure(dirPath: string): Promise<void> { return ensure(dirPath); }
    scan(
        dirPath: string,
        extensions: ReadonlyArray<string> = [],
        excludeDirs: ReadonlyArray<string> = [],
    ): Promise<string[]> {
        return scan(dirPath, extensions, excludeDirs);
    }
}

// Synchronous existence helpers re-exported for stages that need them
// (e.g. mirroring `fsSync.existsSync` in the original build-assets.js).
export { existsSync, statSync, readdirSync };

