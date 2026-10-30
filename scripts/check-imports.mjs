import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';
import { pathToFileURL } from 'node:url';

const builtins = new Set(builtinModules);
const IMPORTS = /(?:^|[;\n])\s*(?:import|export)\s+(?:type\s+)?(?:[^;'"]*?\s+from\s+)?["']([^"']+)["']|\b(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/gm;

/** Module specifiers imported or re-exported by JavaScript or declaration source, including multi-line import lists. */
export function importSpecifiers(source) {
    return [...source.matchAll(IMPORTS)].map((match) => match[1] ?? match[2]);
}

function check() {
    const packagesDir = path.resolve('packages');
    let failed = false;

    for (const name of readdirSync(packagesDir)) {
        const root = path.join(packagesDir, name);
        const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
        const declared = new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.peerDependencies ?? {}), manifest.name]);
        const dist = path.join(root, 'dist');
        for (const file of readdirSync(dist, { recursive: true, withFileTypes: true })) {
            if (!file.isFile() || !/\.(?:js|d\.ts)$/.test(file.name)) {
                continue;
            }
            const filename = path.join(file.parentPath, file.name);
            const source = readFileSync(filename, 'utf8');
            for (const specifier of importSpecifiers(source)) {
                if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('node:') || builtins.has(specifier)) {
                    continue;
                }
                const parts = specifier.split('/');
                const dependency = specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
                const typePackage = dependency.startsWith('@') ? `@types/${dependency.slice(1).replace('/', '__')}` : `@types/${dependency}`;
                if (!declared.has(dependency) && !(filename.endsWith('.d.ts') && declared.has(typePackage))) {
                    process.stderr.write(`${filename}: undeclared import ${specifier}\n`);
                    failed = true;
                }
            }
        }
    }
    if (failed) {
        process.exitCode = 1;
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    check();
}
