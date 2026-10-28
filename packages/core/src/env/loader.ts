/**
 * Plugin loader.
 *
 * Resolves extension specifiers (npm package names or local paths) declared in
 * `config/config-nuckty.ts` `ext[]`, imports each, and invokes its `register(env)`
 * export with the `NucktyEnv`. Extensions register through five entry points:
 * `env.commands`, `env.document`, `env.markdown`, `env.levels`, `env.pipeline`.
 * Block templates register through the deps walker (`src/blocks/loader.ts`).
 *
 * Resolution contract (arch review RUNTIME-004):
 *   - bare specifier (`pkg` / `@scope/pkg`) → resolved from the CONSUMER root
 *     via Node's ESM resolver and package.json `exports`/`main` rules. Bare
 *     dynamic import runs relative to the ENGINE module, so a package
 *     installed only in the consumer (`file:`-linked layouts) was previously
 *     unresolvable.
 *   - local file (`./dir/file.mjs`) → file URL as before.
 *   - local directory (openspec example `./blocks/local`) → the directory's
 *     package.json main/exports entry, resolved explicitly (ESM has no
 *     directory imports).
 *   - absolute path → file URL as before.
 * Node resolves bare packages; local directory entries are selected explicitly.
 *
 * Each ext entry calls its named register or default function in the current
 * environment. The engine treats all extensions uniformly — first-party `@nuckty/ext-*` and
 * third-party packages are wired identically. No extension has engine-level
 * privilege.
 *
 * @module env/loader
 */

import { pathToFileURL as toURL } from 'node:url';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import type { NucktyEnv } from './env.js';

/** A plugin module exports `register(env)` (named or default). */
export interface PluginModule {
    register?: (env: NucktyEnv) => void | Promise<void>;
    default?: (env: NucktyEnv) => void | Promise<void>;
}

export interface LoadOptions {
    /** Directory to resolve relative plugin paths against (the consumer root). */
    cwd: string;
}

/**
 * Load and apply plugins to the environment.
 *
 * @param env the environment plugins register into
 * @param ext package names or local paths starting with ./, ../ or /
 * @param opts resolution options
 */
export async function loadPlugins(
    env: NucktyEnv,
    ext: string[],
    opts: LoadOptions,
): Promise<void> {
    for (const spec of ext) {
        const modulePath = resolvePluginPath(spec, opts.cwd);
        const mod = (await import(modulePath)) as PluginModule;
        const register = mod.register ?? mod.default;
        if (typeof register !== 'function') {
            throw new Error(
                `nuckty: plugin "${spec}" does not export a register function. ` +
                    'Expected "export function register(env)" or a default function.',
            );
        }
        await register(env);
    }
}

/** Resolve a plugin specifier to a module path import() can handle. */
export function resolvePluginPath(spec: string, cwd: string): string {
    // Absolute path or an explicit file → file URL.
    if (spec.startsWith('/')) {
        return toURL(path.resolve(spec)).href;
    }
    // Relative specifier: resolve against the consumer root. A directory is
    // resolved through its package.json main/exports (no ESM dir imports).
    if (spec.startsWith('./') || spec.startsWith('../')) {
        const abs = path.resolve(cwd, spec);
        return resolveLocal(abs, spec);
    }
    // Delegate to Node's ESM resolver with the consumer as parent. The hook is
    // synchronous and removed before returning; no filesystem helper is emitted.
    const hooks = registerHooks({
        resolve(request, context, nextResolve) {
            return nextResolve(request, { ...context, parentURL: toURL(path.join(cwd, 'package.json')).href });
        },
    });
    try {
        return import.meta.resolve(spec);
    } finally {
        hooks.deregister();
    }
}

/** Resolve a local (consumer-relative) extension path to an importable URL. */
function resolveLocal(abs: string, spec: string): string {
    // A package.json inside? → directory with an entry point.
    const pkgPath = path.join(abs, 'package.json');
    let source: string;

    try {
        source = readFileSync(pkgPath, 'utf8');
    } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) {
            return toURL(abs).href;
        }

        throw error;
    }
    const pkg = JSON.parse(source) as { main?: string; exports?: unknown };
    const entry = pickEntry(pkg, abs);

    if (entry) {
        return entry;
    }

    throw new Error(`nuckty: extension "${spec}" (${abs}) has a package.json without a resolvable main/exports entry`);
}

/** Resolve the root export using the conditions of this Node process. */
function pickEntry(pkg: { main?: string; exports?: unknown }, dir: string): string | null {
    if (pkg.exports === undefined) {
        return typeof pkg.main === 'string' ? toURL(path.resolve(dir, pkg.main)).href : null;
    }
    let target: unknown = pkg.exports;

    if (target && typeof target === 'object' && !Array.isArray(target) && Object.hasOwn(target, '.')) {
        target = (target as Record<string, unknown>)['.'];
    }
    let conditions: ReadonlySet<string> = new Set();
    const hooks = registerHooks({
        resolve(request, context, nextResolve) {
            conditions = new Set(context.conditions);

            return nextResolve(request, context);
        },
    });

    try {
        import.meta.resolve('node:fs');
    } finally {
        hooks.deregister();
    }
    const entry = selectConditionalEntry(target, conditions);

    return typeof entry === 'string' ? new URL(entry, toURL(dir + path.sep)).href : null;
}

/** Undefined means no active condition; null explicitly blocks the entry. */
function selectConditionalEntry(target: unknown, conditions: ReadonlySet<string>): string | null | undefined {
    if (target === null) {
        return null;
    }
    if (typeof target === 'string') {
        const pathname = target.split(/[?#]/, 1)[0]!;
        const segments = pathname.slice(2).split(/[\\/]/);
        const invalid = !target.startsWith('./') || segments.some((segment) => {
            const decoded = decodeURIComponent(segment).toLowerCase();

            return decoded === '.' || decoded === '..' || decoded === 'node_modules' || /[\\/]/.test(decoded);
        });

        if (invalid) {
            throw Object.assign(new Error('nuckty: invalid local package export target'), { code: 'ERR_INVALID_PACKAGE_TARGET' });
        }

        return target;
    }
    if (Array.isArray(target)) {
        for (const candidate of target) {
            try {
                const selected = selectConditionalEntry(candidate, conditions);

                if (selected !== undefined && selected !== null) {
                    return selected;
                }
            } catch (error) {
                if (!error || typeof error !== 'object' || !('code' in error) || error.code !== 'ERR_INVALID_PACKAGE_TARGET') {
                    throw error;
                }
            }
        }

        return null;
    }
    if (target && typeof target === 'object') {
        for (const [condition, candidate] of Object.entries(target)) {
            if (condition !== 'default' && !conditions.has(condition)) {
                continue;
            }
            const selected = selectConditionalEntry(candidate, conditions);

            if (selected !== undefined) {
                return selected;
            }
        }
    }

    if (target !== undefined && (typeof target !== 'object' || !target)) {
        throw Object.assign(new Error('nuckty: invalid local package export target'), { code: 'ERR_INVALID_PACKAGE_TARGET' });
    }

    return undefined;
}
