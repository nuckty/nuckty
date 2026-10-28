/** Install and build this demo from public npm without sibling package sources. */
import { realpathSync, mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { sourceCopyFilter } from './copy-filter.mjs';

const demo = realpathSync(path.resolve(import.meta.dirname, '..'));
const temp = mkdtempSync(path.join(tmpdir(), 'nuckty-demo-clean-install-'));
const cleanDemo = path.join(temp, 'consumer');
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
    cpSync(demo, cleanDemo, { recursive: true, filter: sourceCopyFilter(demo) });
    const manifest = JSON.parse(readFileSync(path.join(cleanDemo, 'package.json'), 'utf8'));

    for (const [name, version] of Object.entries(manifest.dependencies)) {
        assert.ok(!version.startsWith('file:'), `${name}: registry dependency required`);
    }

    npm(['ci', '--no-audit', '--no-fund', '--registry=https://registry.npmjs.org'], cleanDemo);
    npm(['run', 'build'], cleanDemo);
    assert.ok(readFileSync(path.join(cleanDemo, 'site/html/index.html'), 'utf8').length > 0, 'clean demo build must emit HTML');
    assert.ok(readFileSync(path.join(cleanDemo, 'site-en/html/index.html'), 'utf8').includes('lang=en'), 'clean demo build must emit English HTML');
    passed = true;
    process.stdout.write('Clean registry install passed: demo npm ci from its checked-in manifest and lockfile, then standalone build.\n');
} catch (error) {
    process.stderr.write(`Clean install failed; isolated snapshot preserved at ${temp}\n`);
    throw error;
} finally {
    if (passed) {
        rmSync(temp, { recursive: true, force: true });
    }
}
