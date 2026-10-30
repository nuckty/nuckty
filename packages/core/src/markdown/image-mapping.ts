/** Shared URL resolver for Markdown and raw HTML image references. */
import path from 'node:path';

export interface ImageMappingEnv {
    imageMapping?: Record<string, string> | undefined;
    /** Current file relative to the content root. */
    sourceFile?: string | undefined;
    /** Source path relative to the consumer root, used when `sourceFile` is absent. */
    inputPath?: string | undefined;
}

export function transformImagePathShared(originalPath: string, env: ImageMappingEnv): string {
    const mapping = env.imageMapping ?? {};
    const inputUrl = originalPath.replace(/^[\x00-\x20]+|[\x00-\x20]+$/g, '').replace(/[\t\n\r]/g, '');

    if (!inputUrl || /^[a-z][a-z\d+.-]*:/i.test(inputUrl) || inputUrl.startsWith('//')) {
        return originalPath;
    }

    const suffixIndex = inputUrl.search(/[?#]/);
    const suffix = suffixIndex < 0 ? '' : inputUrl.slice(suffixIndex);
    let pathname = suffixIndex < 0 ? inputUrl : inputUrl.slice(0, suffixIndex);
    try {
        pathname = decodeURIComponent(pathname);
    } catch {
        // Preserve malformed URI escapes rather than guessing a different asset.
    }
    const normalized = path.posix.normalize(pathname.replace(/\\/g, '/').replace(/^\/+/, ''));
    const mappedUrl = (key: string): string | undefined => {
        const value = Object.hasOwn(mapping, key) ? mapping[key] : undefined;

        return value ? (value.startsWith('/') ? value : '/' + value) + suffix : undefined;
    };
    // Explicit mapping keys remain authoritative regardless of insertion order.
    let mapped = mappedUrl(normalized);
    const input = env.sourceFile?.replace(/\\/g, '/') ?? env.inputPath?.replace(/^(?:\.\/)?external\/[^/]+\//, '');

    if (!mapped && input && !pathname.startsWith('/')) {
        mapped = mappedUrl(path.posix.join(path.posix.dirname(input), normalized));
    }
    if (mapped) {
        return mapped;
    }
    // A qualified path must never silently select an unrelated basename.
    if (pathname.includes('/')) {
        return originalPath;
    }

    const keys = Object.keys(mapping).filter(key => path.posix.basename(key) === normalized);
    if (keys.length > 1) {
        throw new Error(`Ambiguous image "${originalPath}" in ${env.inputPath ?? 'unknown file'}: ${keys.sort().join(', ')}`);
    }

    return keys[0] ? mappedUrl(keys[0])! : originalPath;
}
