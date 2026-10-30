import { mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { loadSiteConfig } from '../utils/site-config.js';
import { runBuild } from './helpers/build.js';

async function makeProject(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-site-config-'));
    await writeFile(path.join(dir, 'package.json'), '{"type":"module"}');
    await mkdir(path.join(dir, 'config'), { recursive: true });
    return dir;
}

test('site config rejects malformed JSON and non-object roots', async () => {
    const dir = await makeProject();
    try {
        const configPath = path.join(dir, 'config', 'site.json');
        for (const input of ['{ invalid json', 'null', '[]']) {
            await writeFile(configPath, input);
            assert.throws(() => loadSiteConfig(path.join(dir, 'config')));
        }
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('site config malformed JSON errors omit the raw payload', async () => {
    const dir = await makeProject();
    const sentinel = 'SYNTHETIC_PASSWORD_SECRET_SENTINEL';
    try {
        const configPath = path.join(dir, 'config', 'site.json');
        await writeFile(configPath, `{"password":"${sentinel}", invalid}`);

        assert.throws(() => loadSiteConfig(path.join(dir, 'config')), (error: SyntaxError) => {
            assert.ok(error.message.includes(configPath));
            assert.match(error.message, /malformed JSON at position \d+/);
            assert.doesNotMatch(error.message, new RegExp(sentinel));
            return true;
        });
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('site config propagates read errors other than a missing file', async () => {
    const dir = await makeProject();
    try {
        await mkdir(path.join(dir, 'config', 'site.json'));
        assert.throws(() => loadSiteConfig(path.join(dir, 'config')), (error: NodeJS.ErrnoException) => error.code !== 'ENOENT');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('site config validates known field types while allowing unknown metadata', async () => {
    const dir = await makeProject();
    try {
        const configPath = path.join(dir, 'config', 'site.json');
        const invalidConfigs: unknown[] = [
            { baseUrl: 1 },
            { rootTitle: null },
            { logPrefix: [] },
            { bundles: 'page' },
            { githubRawBase: 1 },
            { githubRawBase: ['base', null] },
            { assetSources: [] },
            { assetSources: { logo: false } },
        ];

        for (const value of invalidConfigs) {
            await writeFile(configPath, JSON.stringify(value));
            assert.throws(() => loadSiteConfig(path.join(dir, 'config')), /Invalid site config/);
        }

        await writeFile(configPath, JSON.stringify({ consumerMetadata: { release: 3 } }));
        assert.deepEqual(loadSiteConfig(path.join(dir, 'config')).consumerMetadata, { release: 3 });
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('runBuild rejects malformed site config before cleaning the output', async () => {
    const dir = await makeProject();
    try {
        await writeFile(path.join(dir, 'config', 'config-nuckty.ts'),
            `export default { targets: { default: { configDir: 'config/', outDir: 'site/' } } };\n`);
        await mkdir(path.join(dir, 'site'), { recursive: true });
        await writeFile(path.join(dir, 'site', 'sentinel'), 'keep');

        const siteConfigPath = path.join(dir, 'config', 'site.json');
        for (const config of ['{ invalid json', JSON.stringify({ bundles: 'page' })]) {
            await writeFile(siteConfigPath, config);
            await assert.rejects(() => runBuild({ cwd: dir, command: 'build' }));
            assert.equal(await readFile(path.join(dir, 'site', 'sentinel'), 'utf8'), 'keep');
        }
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('site-config loads site.json with defaults merged', async () => {
    const dir = await makeProject();
    try {
        await mkdir(path.join(dir, 'config'), { recursive: true });
        await writeFile(path.join(dir, 'config', 'site.json'), JSON.stringify({
            baseUrl: 'https://fixture.test',
            rootTitle: 'Fixture',
            githubRawBase: null,
            bundles: ['page'],
        }));
        const cfg = loadSiteConfig(path.join(dir, 'config'));
        assert.equal(cfg.baseUrl, 'https://fixture.test');
        assert.equal(cfg.rootTitle, 'Fixture');
        assert.deepEqual(cfg.bundles, ['page']);
        assert.equal(cfg.logPrefix, 'nuckty');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('site-config falls back to defaults when site.json is missing', async () => {
    const dir = await makeProject();
    const warning = mock.method(console, 'warn', () => {});

    try {
        const cfg = loadSiteConfig(path.join(dir, 'config'));
        assert.equal(cfg.baseUrl, 'https://example.com');
        assert.deepEqual(cfg.bundles, []);
        assert.equal(warning.mock.callCount(), 1);
    } finally {
        warning.mock.restore();
        await rm(dir, { recursive: true, force: true });
    }
});
