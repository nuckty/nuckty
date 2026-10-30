import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { BuildContext } from '../pipeline/pipeline.js';
import { cleanStage } from '../stages/index.js';
import { transformImagePathShared } from '../markdown/image-mapping.js';
import { parseSitemapLine } from '../stages/sitemap.js';

test('clean retains preview ownership and logs while removing intermediate artifacts', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'nuckty-clean-Ω-'));
    const buildDir = path.join(root, '.build');
    const outDir = path.join(root, 'site');

    try {
        await fs.mkdir(path.join(buildDir, 'serve/main/logs'), { recursive: true });
        await fs.mkdir(outDir);
        await fs.writeFile(path.join(buildDir, 'serve/main/nginx.pid'), '12345');
        await fs.writeFile(path.join(buildDir, 'serve/main/nginx.conf'), 'owned config');
        await fs.writeFile(path.join(buildDir, 'serve/main/logs/error.log'), 'owned log');
        await fs.writeFile(path.join(buildDir, 'page.css'), 'old intermediate');
        await fs.writeFile(path.join(outDir, 'old.html'), 'old output');
        await cleanStage({ buildDir, outDir } as BuildContext);
        assert.equal(await fs.readFile(path.join(buildDir, 'serve/main/nginx.pid'), 'utf8'), '12345');
        assert.equal(await fs.readFile(path.join(buildDir, 'serve/main/nginx.conf'), 'utf8'), 'owned config');
        assert.equal(await fs.readFile(path.join(buildDir, 'serve/main/logs/error.log'), 'utf8'), 'owned log');
        assert.deepEqual(await fs.readdir(outDir), []);
        await assert.rejects(fs.access(path.join(buildDir, 'page.css')), { code: 'ENOENT' });
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
});

test('image lookup ignores inherited object keys but honors explicit own keys', () => {
    for (const name of ['constructor', 'toString', '__proto__']) {
        assert.equal(transformImagePathShared(name, { imageMapping: {} }), name);
        const imageMapping = Object.fromEntries([[name, '_ifoo']]);

        assert.equal(transformImagePathShared(name, { imageMapping }), '/_ifoo');
    }
});

test('metadata preserves JSON and legacy string values, URLs, quotes and trailing commas', () => {
    const expected = { navLabel: 'https://example.com/a,b', layout: 'main', title: 'Writer\'s "guide"' };

    assert.deepEqual(parseSitemapLine(`Home [/, home.md, ${JSON.stringify(expected)}]`)?.meta, expected);
    assert.deepEqual(parseSitemapLine("Home [/, home.md, {navLabel: 'https://example.com/a,b', layout: 'main', title: 'Writer\\'s \"guide\"',}]")?.meta, expected);
});
