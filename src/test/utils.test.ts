/**
 * Tests for the ported utility modules (dir / hash / site-config).
 *
 * @module test/utils
 */

import { mock, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { generateHash, generateFileHash } from '../utils/hash.js';
import {
    getBuild,
    getSite,
    getContent,
    getExternalContentRelative,
    getExternalRepoDirs,
    resetLevelsCache,
    scan,
    Dir,
} from '../utils/dir.js';
import {
    loadConfig,
    resetConfig,
    getBaseUrl,
    getBundles,
    getRootTitle,
} from '../utils/site-config.js';

async function makeProject(): Promise<string> {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-utils-'));
    await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'fixture' }));
    return dir;
}

test('generateHash: deterministic, 16 hex chars', () => {
    assert.equal(generateHash('abc'), generateHash('abc'));
    assert.match(generateHash('abc'), /^[a-f0-9]{16}$/);
});

test('generateHash: different inputs differ', () => {
    assert.notEqual(generateHash('a'), generateHash('b'));
});

test('file hashing includes every stream chunk and reports absent input', async () => {
    const dir = await makeProject();
    const file = path.join(dir, 'large.mp4');
    const bytes = Buffer.alloc(1024 * 1024, 65);

    try {
        await writeFile(file, bytes);
        assert.equal(await generateFileHash(file), generateHash(bytes));
        await assert.rejects(generateFileHash(path.join(dir, 'absent.mp4')), { code: 'ENOENT' });
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('Dir instance mirrors static helpers against the same root', async () => {
    const dir = await makeProject();
    try {
        await mkdir(path.join(dir, 'content'), { recursive: true });
        await mkdir(path.join(dir, 'config'), { recursive: true });
        await writeFile(path.join(dir, 'config', 'levels.json'), JSON.stringify(['content', 'blocks']));
        resetLevelsCache();
        const d = new Dir(dir);
        assert.equal(d.getRoot(), dir);
        assert.equal(d.getBuild(), getBuild(dir));
        assert.equal(d.getSite(), getSite(dir));
        assert.equal(d.getContent(), getContent(dir));
        assert.equal(d.getExternalContentRelative(), './content/');
        // getExternalContentRelative uses trailing slash, matches the JS port.
        assert.equal(getExternalContentRelative(dir), './content/');
    } finally {
        await rm(dir, { recursive: true, force: true });
        resetLevelsCache();
    }
});

test('scan lists files by extension, skipping dot-dirs', async () => {
    const dir = await makeProject();
    try {
        await mkdir(path.join(dir, 'a', '.git'), { recursive: true });
        await writeFile(path.join(dir, 'a', 'x.css'), '');
        await writeFile(path.join(dir, 'a', 'y.js'), '');
        await writeFile(path.join(dir, 'a', '.git', 'config'), '');
        const css = await scan(path.join(dir, 'a'), ['.css']);
        assert.deepEqual(css.map((p) => path.basename(p)), ['x.css']);
        const all = await scan(path.join(dir, 'a'));
        assert.ok(all.some((p) => p.endsWith('y.js')));
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
            contentRepo: 'content',
            assetRepos: [],
            githubRawBase: null,
            bundles: ['page'],
        }));
        resetConfig();
        const cfg = loadConfig(dir);
        assert.equal(cfg.baseUrl, 'https://fixture.test');
        assert.equal(cfg.rootTitle, 'Fixture');
        assert.deepEqual(getBundles(dir), ['page']);
        assert.equal(getBaseUrl(dir), 'https://fixture.test');
        assert.equal(getRootTitle(dir), 'Fixture');
    } finally {
        await rm(dir, { recursive: true, force: true });
        resetConfig();
    }
});

test('site-config falls back to defaults when site.json is missing', async () => {
    const dir = await makeProject();
    const warning = mock.method(console, 'warn', () => {});

    try {
        resetConfig();
        const cfg = loadConfig(dir);
        assert.equal(cfg.baseUrl, 'https://example.com');
        assert.deepEqual(cfg.bundles, []);
        assert.equal(warning.mock.callCount(), 1);
    } finally {
        warning.mock.restore();
        await rm(dir, { recursive: true, force: true });
        resetConfig();
    }
});

// ---- getExternalRepoDirs (assets stage scans every external repo) -----------
// openspec `assets` / `images`: a site's assets live in whichever repo carries
// them (docs, install, content), not only the content repo. `getExternalRepoDirs`
// maps `config/external.json` URLs → `external/<repo-name>/` and returns only
// dirs that exist. With no external.json it scans `external/` directly.

test('getExternalRepoDirs maps external.json URLs to external/<name>/ dirs that exist', async () => {
    const dir = await makeProject();
    try {
        await mkdir(path.join(dir, 'config'), { recursive: true });
        await mkdir(path.join(dir, 'external', 'docs'), { recursive: true });
        await mkdir(path.join(dir, 'external', 'install'), { recursive: true });
        // A URL not present on disk (`other`) is skipped, not thrown.
        await writeFile(
            path.join(dir, 'config', 'external.json'),
            JSON.stringify([
                'https://github.com/nuckty/docs.git',
                'https://github.com/nuckty/install.git',
                'https://github.com/nuckty/other.git',
            ]),
        );
        const dirs = getExternalRepoDirs(dir).map((p) => path.basename(p));
        assert.deepEqual(dirs.sort(), ['docs', 'install']);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('getExternalRepoDirs strips a trailing .git and takes the last path segment as the name', async () => {
    const dir = await makeProject();
    try {
        await mkdir(path.join(dir, 'config'), { recursive: true });
        await mkdir(path.join(dir, 'external', 'content'), { recursive: true });
        await writeFile(
            path.join(dir, 'config', 'external.json'),
            JSON.stringify(['https://example.com/fixture/content.git']),
        );
        const dirs = getExternalRepoDirs(dir);
        assert.equal(dirs.length, 1);
        assert.equal(path.basename(dirs[0]!), 'content');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('getExternalRepoDirs falls back to scanning external/ when external.json is absent', async () => {
    // No external.json → the function reads whatever `external/` contains
    // (directories and symlinks). This covers the symlinked-repo layout a
    // consumer uses to avoid duplicating large external repos.
    const dir = await makeProject();
    try {
        await mkdir(path.join(dir, 'external', 'docs'), { recursive: true });
        await mkdir(path.join(dir, 'external', 'real'), { recursive: true });
        await symlink(
            path.join(dir, 'external', 'real'),
            path.join(dir, 'external', 'linked'),
        );
        const dirs = getExternalRepoDirs(dir).map((p) => path.basename(p));
        assert.deepEqual(dirs.sort(), ['docs', 'linked', 'real']);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('getExternalRepoDirs returns an empty array when external/ is missing', async () => {
    const dir = await makeProject();
    try {
        assert.deepEqual(getExternalRepoDirs(dir), []);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('getBundles honors the target configDir (RUNTIME-005)', async () => {
    const dir = await makeProject();
    try {
        resetConfig();
        await mkdir(path.join(dir, 'config'), { recursive: true });
        await mkdir(path.join(dir, 'config-a'), { recursive: true });
        await mkdir(path.join(dir, 'config-b'), { recursive: true });
        await writeFile(path.join(dir, 'config', 'site.json'), JSON.stringify({ bundles: ['a'] }));
        await writeFile(path.join(dir, 'config-a', 'site.json'), JSON.stringify({ bundles: ['x'] }));
        await writeFile(path.join(dir, 'config-b', 'site.json'), JSON.stringify({ bundles: ['y'] }));
        assert.deepEqual(getBundles(dir), ['a']);
        assert.deepEqual(getBundles(dir, 'config-a'), ['x']);
        assert.deepEqual(getBundles(dir, 'config-b'), ['y']);
        assert.deepEqual(getBundles(dir), ['a'], 'the two target reads must not clobber the root read');
    } finally {
        resetConfig();
        await rm(dir, { recursive: true, force: true });
    }
});

