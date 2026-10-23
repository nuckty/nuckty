/** Warm the shared npm cache for the package smoke test's offline install. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const demo = path.resolve(import.meta.dirname, '..');
const workspace = path.dirname(demo);
const packages = [
    'nuckty',
    'nuckty-ext-block-gallery',
    'nuckty-ext-block-grid',
    'nuckty-ext-block-root',
    'nuckty-ext-command-content-external',
    'nuckty-ext-command-convert-images',
    'nuckty-ext-command-deploy-ftp',
    'nuckty-ext-command-serve',
    'nuckty-ext-command-validate-vnu',
    'nuckty-ext-markdown-typography-ru',
    'nuckty-ext-markdown-video',
];
const dependencies = new Map();
const env = { ...process.env };

if (!env.npm_config_cache) {
    env.npm_config_cache = execFileSync('npm', ['config', 'get', 'cache'], { encoding: 'utf8' }).trim();
}

for (const name of packages) {
    const manifest = JSON.parse(readFileSync(path.join(workspace, name, 'package.json'), 'utf8'));
    for (const [dependency, version] of Object.entries(manifest.dependencies ?? {})) {
        const current = dependencies.get(dependency);
        if (current && current !== version) {
            throw new Error(`${dependency} has conflicting runtime ranges (${current} and ${version}); prepare the package cache with distinct dependency aliases.`);
        }
        dependencies.set(dependency, version);
    }
}

const demoManifest = JSON.parse(readFileSync(path.join(demo, 'package.json'), 'utf8'));
for (const dependency of ['typescript', '@types/node', '@tanstack/highlight']) {
    const version = demoManifest.devDependencies?.[dependency];
    if (!version) {
        throw new Error(`The demo must pin ${dependency} to verify its package smoke typecheck.`);
    }
    const current = dependencies.get(dependency);
    if (current && current !== version) {
        throw new Error(`${dependency} has conflicting runtime and demo test ranges (${current} and ${version}).`);
    }
    dependencies.set(dependency, version);
}

const temp = mkdtempSync(path.join(tmpdir(), 'nuckty-package-cache-prep-'));
try {
    writeFileSync(path.join(temp, 'package.json'), JSON.stringify({
        name: 'nuckty-package-cache-prep',
        private: true,
        version: '1.0.0-beta1',
        dependencies: Object.fromEntries([...dependencies].sort(([left], [right]) => left.localeCompare(right))),
    }, null, 2) + '\n');
    process.stdout.write(`Preparing shared npm cache for offline package smoke (${packages.length} source packages, ${dependencies.size} dependency ranges) from registry.npmjs.org.\n`);
    execFileSync('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--package-lock=false', '--registry=https://registry.npmjs.org'], {
        cwd: temp,
        env,
        stdio: 'inherit',
    });
    process.stdout.write(`npm cache prepared at ${env.npm_config_cache}.\n`);
} catch (error) {
    process.stderr.write(`Package cache preparation failed; no offline fallback was attempted.\n`);
    throw error;
} finally {
    rmSync(temp, { recursive: true, force: true });
}
