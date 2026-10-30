/**
 * ESM loader hook — lets `nuckty` import TypeScript extensions (and the
 * consumer `config-nuckty.ts`) under plain Node 24, without tsx.
 *
 * Why this exists: TypeScript's `NodeNext` convention has authors write
 * `import './foo.js'` inside `.ts` files (the `.js` is the *post-compile*
 * target). Node 24 can execute `.ts` but does not resolve a `.js` specifier
 * inside a `.ts` module back to a `.ts` file — it looks for the literal `.js`
 * and fails with `ERR_MODULE_NOT_FOUND`. tsx papers over this; the standalone
 * `nuckty` CLI must not depend on tsx, so this loader does the same job with
 * `esbuild` (already a core dependency):
 *
 *   resolve — a relative `.js` import whose `.ts` sibling exists is rewritten
 *     to the `.ts` file URL (format `module`).
 *   load — a `.ts` URL is transformed to ESM via `esbuild.transform` and
 *     returned as source.
 *
 * Registered from `bin/nuckty.ts` via `module.register()` before any dynamic
 * `import()`, so every subsequent config/extension import is covered.
 *
 * @module bin/loader
 */

import { transform } from 'esbuild';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Resolve hook: rewrite a relative `.js` import to its `.ts` sibling ONLY when
 * (a) the importing module is itself a `.ts` file (the NodeNext authoring
 * convention this hook exists for), and (b) the literal `.js` does NOT exist
 * on disk, so a `.js` parent importing `./mod.js` always gets the real JavaScript.
 */
export async function resolve(
    specifier: string,
    context: { parentURL?: string },
    nextResolve: (specifier: string, context: { parentURL?: string }) => Promise<{ url: string; format?: string; shortCircuit?: boolean }>,
): Promise<{ url: string; format?: string; shortCircuit?: boolean }> {
    const parent = context.parentURL ?? '';
    const parentIsTs = parent.startsWith('file:') && new URL(parent).pathname.endsWith('.ts');
    if (parentIsTs && (specifier.startsWith('./') || specifier.startsWith('../'))) {
        const imported = new URL(specifier, parent);
        if (imported.pathname.endsWith('.js')) {
            const jsPath = fileURLToPath(imported);
            imported.pathname = imported.pathname.slice(0, -3) + '.ts';
            if (!existsSync(jsPath) && existsSync(fileURLToPath(imported))) {
                return { url: imported.href, format: 'module', shortCircuit: true };
            }
        }
    }
    return nextResolve(specifier, context);
}

/** Load hook: transpile `.ts` URLs to ESM via esbuild; pass through everything else. */
export async function load(
    url: string,
    _context: unknown,
    nextLoad: (url: string, context: unknown) => Promise<{ format: string; source: string; shortCircuit?: boolean }>,
): Promise<{ format: string; source: string; shortCircuit?: boolean }> {
    if (url.startsWith('file:') && new URL(url).pathname.endsWith('.ts')) {
        const filePath = fileURLToPath(url);
        const code = readFileSync(filePath, 'utf8');
        const result = await transform(code, { loader: 'ts', format: 'esm', sourcefile: filePath });
        return { format: 'module', source: result.code, shortCircuit: true };
    }
    return nextLoad(url, _context);
}
