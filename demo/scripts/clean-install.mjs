/** Check this demo's lockfile and build from a clean copy of its sibling topology. */
import { realpathSync, mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { sourceCopyFilter } from './copy-filter.mjs';

const demo = realpathSync(path.resolve(import.meta.dirname, '..'));
const workspace = path.dirname(demo);
const temp = mkdtempSync(path.join(tmpdir(), 'nuckty-demo-clean-install-'));
const snapshot = path.join(temp, 'workspace');
const sources = [
    'nuckty',
    'nuckty-ext-block-root',
    'nuckty-ext-command-serve',
    'nuckty-ext-command-validate-vnu',
    'nuckty-ext-command-deploy-ftp',
    'nuckty-ext-block-gallery',
    'nuckty-ext-block-grid',
    'nuckty-ext-markdown-typography-ru',
    'nuckty-demo',
];
const env = {
    ...process.env,
    npm_config_registry: 'https://registry.npmjs.org',
    npm_config_userconfig: path.join(temp, 'npmrc'),
    npm_config_globalconfig: path.join(temp, 'global.npmrc'),
    npm_config_cache: process.env.npm_config_cache ?? path.join(temp, 'cache'),
};
writeFileSync(env.npm_config_userconfig, '');
writeFileSync(env.npm_config_globalconfig, '');

function npm(args, cwd) {
    try {
        return execFileSync('npm', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env });
    } catch (error) {
        process.stderr.write(error.stdout ?? '');
        process.stderr.write(error.stderr ?? '');
        throw new Error(`npm ${args.join(' ')} failed in ${cwd}`, { cause: error });
    }
}

let passed = false;
try {
    mkdirSync(snapshot);
    for (const name of sources) {
        const source = name === 'nuckty-demo' ? demo : realpathSync(path.join(workspace, name));
        const copy = path.join(snapshot, name);
        const relative = path.relative(snapshot, copy);
        assert.ok(relative && !relative.startsWith(`..${path.sep}`) && relative !== '..', `${name}: copy must stay in the temporary snapshot`);
        cpSync(source, copy, {
            recursive: true,
            filter: sourceCopyFilter(source),
        });
    }

    const siblingPackages = sources.slice(0, -1);
    for (const name of siblingPackages) {
        const cwd = path.join(snapshot, name);
        npm(['ci', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org'], cwd);
        npm(['run', 'build'], cwd);
    }

    const cleanDemo = path.join(snapshot, 'nuckty-demo');
    const manifest = JSON.parse(readFileSync(path.join(cleanDemo, 'package.json'), 'utf8'));
    assert.equal(manifest.dependencies.nuckty, 'file:../nuckty', 'check must use the demo manifest and sibling topology');
    npm(['ci', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org'], cleanDemo);
    npm(['run', 'build'], cleanDemo);
    assert.ok(readFileSync(path.join(cleanDemo, 'site/html/index.html'), 'utf8').length > 0, 'clean demo build must emit HTML');
    assert.ok(readFileSync(path.join(cleanDemo, 'site-en/html/index.html'), 'utf8').includes('lang=en'), 'clean demo build must emit English HTML');
    passed = true;
    process.stdout.write('Clean install passed: prepared sibling packages, demo npm ci from its checked-in manifest and lockfile, and demo build in an isolated topology.\n');
} catch (error) {
    process.stderr.write(`Clean install failed; isolated snapshot preserved at ${temp}\n`);
    throw error;
} finally {
    if (passed) {
        rmSync(temp, { recursive: true, force: true });
    }
}
