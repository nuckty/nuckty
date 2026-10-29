/**
 * End-to-end tests for the assets stage (`assetsStage`) — exercises recursive
 * discovery of PDF/ZIP/INI assets and hashed MP4 videos across multiple
 * external repositories declared through `config/external.json`, content
 * preservation, hashed video filenames, the `videoHash` store map, the
 * available/missing repo metadata, and the contractual behavior for absent
 * repos and unreadable source files. The existing robots.txt assertion in
 * stages.test.ts is NOT counted as proof of external asset processing — these
 * tests do that.
 *
 * @module test/assets-stage
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { assetsStage } from '../stages/assets.js';
import { NucktyEnv } from '../env/env.js';
import type { BuildContext } from '../pipeline/pipeline.js';
import { generateHash } from '../utils/hash.js';

const PDF_BYTES = Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
const ZIP_BYTES = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
const INI_BYTES = Buffer.from('[main]\nenabled=true\n');
const MP4_BYTES = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x00, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x6d, 0x70, 0x34, 0x31, 0x6d, 0x70, 0x34, 0x31, 0x00, 0x00]);

/** Build a temp project + BuildContext for the assets stage. */
async function makeCtx(
    overrides: Partial<BuildContext> = {},
): Promise<{ ctx: BuildContext; dir: string }> {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-assets-'));
    await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'assets-fixture', type: 'module' }));
    await mkdir(path.join(dir, 'config'), { recursive: true });
    await writeFile(path.join(dir, 'config', 'site.json'), JSON.stringify({
        baseUrl: 'https://example.com',
        rootTitle: 'X',
        contentRepo: 'content',
        assetRepos: [],
        githubRawBase: null,
        bundles: ['page'],
    }));
    await writeFile(path.join(dir, 'config', 'levels.json'), JSON.stringify(['content', 'blocks']));
    const ctx: BuildContext = {
        cwd: dir,
        configDir: path.join(dir, 'config'),
        buildDir: path.join(dir, '.build'),
        outDir: path.join(dir, 'site'),
        target: 'default',
        env: new NucktyEnv(),
        templates: {} as BuildContext['templates'],
        store: {},
        cache: new Map(),
        ...overrides,
    };
    return { ctx, dir };
}

test('assetsStage recursively discovers and copies nested PDF/ZIP/INI from multiple repos', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        // Two external repos declared through config/external.json.
        await writeFile(path.join(dir, 'config', 'external.json'), JSON.stringify([
            'https://github.com/nuckty/docs.git',
            'https://github.com/nuckty/install.git',
        ]));
        await mkdir(path.join(dir, 'external', 'docs', 'manual', 'pdf'), { recursive: true });
        await mkdir(path.join(dir, 'external', 'install', 'downloads'), { recursive: true });
        await writeFile(path.join(dir, 'external', 'docs', 'manual', 'pdf', 'guide.pdf'), PDF_BYTES);
        await writeFile(path.join(dir, 'external', 'install', 'downloads', 'archive.zip'), ZIP_BYTES);
        await writeFile(path.join(dir, 'external', 'install', 'settings.ini'), INI_BYTES);

        await assetsStage(ctx);

        // Assets are copied flat to site/ by filename.
        const guide = await readFile(path.join(ctx.outDir, 'guide.pdf'));
        const archive = await readFile(path.join(ctx.outDir, 'archive.zip'));
        const ini = await readFile(path.join(ctx.outDir, 'settings.ini'));
        assert.deepEqual(guide, PDF_BYTES, 'pdf content preserved byte-for-byte');
        assert.deepEqual(archive, ZIP_BYTES, 'zip content preserved byte-for-byte');
        assert.deepEqual(ini, INI_BYTES, 'ini content preserved byte-for-byte');

        const repos = ctx.store['assetRepos'] as { available: string[]; missing: string[] };
        assert.deepEqual(repos.available.sort(), ['docs', 'install']);
        assert.deepEqual(repos.missing, []);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('assetsStage hashes MP4 videos by content and records videoHash', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await writeFile(path.join(dir, 'config', 'external.json'), JSON.stringify(['https://github.com/nuckty/content.git']));
        await mkdir(path.join(dir, 'external', 'content', 'clips'), { recursive: true });
        await writeFile(path.join(dir, 'external', 'content', 'clips', 'intro.mp4'), MP4_BYTES);

        await assetsStage(ctx);

        const expectedHash = generateHash(MP4_BYTES);
        const expectedName = `${expectedHash}.mp4`;
        const videoHash = ctx.store['videoHash'] as Record<string, string>;
        assert.equal(videoHash['intro.mp4'], expectedName, 'videoHash maps original name to hashed name');
        // The hashed file is written to site/.
        const out = await readFile(path.join(ctx.outDir, expectedName));
        assert.deepEqual(out, MP4_BYTES, 'mp4 content preserved under the hashed name');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('assetsStage rejects files with the same name across repos', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await writeFile(path.join(dir, 'config', 'external.json'), JSON.stringify([
            'https://github.com/nuckty/a.git',
            'https://github.com/nuckty/b.git',
        ]));
        await mkdir(path.join(dir, 'external', 'a'), { recursive: true });
        await mkdir(path.join(dir, 'external', 'b'), { recursive: true });
        // Same filename, different content — a collision at the flat output.
        await writeFile(path.join(dir, 'external', 'a', 'readme.pdf'), Buffer.from('AAA'));
        await writeFile(path.join(dir, 'external', 'b', 'readme.pdf'), Buffer.from('BBB'));

        await assert.rejects(async () => await assetsStage(ctx), /Asset filename collision/);
        await assert.rejects(() => readFile(path.join(ctx.outDir, 'readme.pdf')));
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('assetsStage uses an explicit source for a colliding filename, including a later repo', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await writeFile(path.join(dir, 'config', 'site.json'), JSON.stringify({
            assetSources: { 'readme.pdf': 'external/b/readme.pdf' },
        }));
        await writeFile(path.join(dir, 'config', 'external.json'), JSON.stringify([
            'https://github.com/nuckty/a.git',
            'https://github.com/nuckty/b.git',
        ]));
        await mkdir(path.join(dir, 'external', 'a'), { recursive: true });
        await mkdir(path.join(dir, 'external', 'b'), { recursive: true });
        await writeFile(path.join(dir, 'external', 'a', 'readme.pdf'), Buffer.from('AAA'));
        await writeFile(path.join(dir, 'external', 'b', 'readme.pdf'), Buffer.from('BBB'));

        await assetsStage(ctx);

        assert.equal(await readFile(path.join(ctx.outDir, 'readme.pdf'), 'utf8'), 'BBB');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('assetsStage rejects an explicit asset source that is no longer a candidate', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await writeFile(path.join(dir, 'config', 'site.json'), JSON.stringify({
            assetSources: { 'readme.pdf': 'external/b/readme.pdf' },
        }));
        await writeFile(path.join(dir, 'config', 'external.json'), JSON.stringify([
            'https://github.com/nuckty/a.git',
        ]));
        await mkdir(path.join(dir, 'external', 'a'), { recursive: true });
        await writeFile(path.join(dir, 'external', 'a', 'readme.pdf'), Buffer.from('AAA'));

        await assert.rejects(async () => await assetsStage(ctx), /Configured asset source.*does not match an available candidate/);
        await assert.rejects(() => readFile(path.join(ctx.outDir, 'readme.pdf')));
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('MP4 collisions require an explicit source and never select the last repo silently', async () => {
    const { ctx, dir } = await makeCtx();

    try {
        await writeFile(path.join(dir, 'config/external.json'), JSON.stringify(['https://fixture.invalid/a.git', 'https://fixture.invalid/b.git']));
        for (const [repo, bytes] of [['a', 'AAA'], ['b', 'BBB']]) {
            await mkdir(path.join(dir, 'external', repo!), { recursive: true });
            await writeFile(path.join(dir, 'external', repo!, 'intro.mp4'), bytes!);
        }
        await assert.rejects(async () => await assetsStage(ctx), /Asset filename collision/);
        await writeFile(path.join(dir, 'config/site.json'), JSON.stringify({ assetSources: { 'intro.mp4': 'external/a/intro.mp4' } }));
        const nextBuild: BuildContext = { ...ctx, store: {} };

        await assetsStage(nextBuild);
        const selected = (nextBuild.store['videoHash'] as Record<string, string>)['intro.mp4'];

        assert.equal(selected, `${generateHash('AAA')}.mp4`);
        assert.equal(await readFile(path.join(ctx.outDir, selected!), 'utf8'), 'AAA');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('assetsStage skips unsupported extensions (.txt, .md) in external repos', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await writeFile(path.join(dir, 'config', 'external.json'), JSON.stringify(['https://github.com/nuckty/misc.git']));
        await mkdir(path.join(dir, 'external', 'misc'), { recursive: true });
        await writeFile(path.join(dir, 'external', 'misc', 'notes.txt'), 'ignore me');
        await writeFile(path.join(dir, 'external', 'misc', 'README.md'), '# ignore');
        await writeFile(path.join(dir, 'external', 'misc', 'doc.pdf'), PDF_BYTES);

        await assetsStage(ctx);

        await assert.rejects(() => readFile(path.join(ctx.outDir, 'notes.txt')), 'unsupported .txt not copied');
        await assert.rejects(() => readFile(path.join(ctx.outDir, 'README.md')), 'unsupported .md not copied');
        const doc = await readFile(path.join(ctx.outDir, 'doc.pdf'));
        assert.deepEqual(doc, PDF_BYTES, 'supported .pdf still copied');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('assetsStage records a repo declared in external.json but absent on disk as missing', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        // Declared but the external/ directory is never created. The stage
        // resolves every declared repo (including absent ones) and classifies
        // the absent one as `missing`.
        await writeFile(path.join(dir, 'config', 'external.json'), JSON.stringify(['https://github.com/nuckty/ghost.git']));

        await assetsStage(ctx);

        const repos = ctx.store['assetRepos'] as { available: string[]; missing: string[] };
        assert.deepEqual(repos.available, [], 'absent repo is not available');
        assert.deepEqual(repos.missing, ['ghost'], 'absent repo recorded as missing');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('assetsStage reports available and missing repos together in a mixed config', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        // present exists on disk; absent does not. The declared-repo resolver
        // yields both, and the access check classifies each.
        await writeFile(path.join(dir, 'config', 'external.json'), JSON.stringify([
            'https://github.com/nuckty/present.git',
            'https://github.com/nuckty/absent.git',
        ]));
        await mkdir(path.join(dir, 'external', 'present'), { recursive: true });
        await writeFile(path.join(dir, 'external', 'present', 'file.zip'), ZIP_BYTES);

        await assetsStage(ctx);

        const repos = ctx.store['assetRepos'] as { available: string[]; missing: string[] };
        assert.deepEqual(repos.available, ['present'], 'present repo is available');
        assert.deepEqual(repos.missing, ['absent'], 'absent repo is missing');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('assetsStage resolves pinned partial external sources by repository name', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await writeFile(path.join(dir, 'config', 'external.json'), JSON.stringify([{ url: 'https://github.com/nuckty/nuckty.git', ref: 'v1.0.0', path: 'docs' }]));
        await mkdir(path.join(dir, 'external', 'nuckty', 'docs'), { recursive: true });
        await writeFile(path.join(dir, 'external', 'nuckty', 'docs', 'guide.pdf'), PDF_BYTES);

        await assetsStage(ctx);

        assert.deepEqual(await readFile(path.join(ctx.outDir, 'guide.pdf')), PDF_BYTES);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('assetsStage never ships files from external Git metadata', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await writeFile(path.join(dir, 'config', 'external.json'), JSON.stringify(['https://github.com/nuckty/docs.git']));
        await mkdir(path.join(dir, 'external', 'docs', '.git', 'lfs'), { recursive: true });
        await writeFile(path.join(dir, 'external', 'docs', '.git', 'lfs', 'leak.pdf'), PDF_BYTES);
        await writeFile(path.join(dir, 'external', 'docs', '.git', 'leak.mp4'), 'video');
        await writeFile(path.join(dir, 'external', 'docs', 'guide.pdf'), PDF_BYTES);

        await assetsStage(ctx);

        assert.deepEqual((await readdir(ctx.outDir)).sort(), ['guide.pdf']);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('assetsStage still copies robots.txt from config/ alongside external assets', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await writeFile(path.join(dir, 'config', 'external.json'), JSON.stringify(['https://github.com/nuckty/docs.git']));
        await mkdir(path.join(dir, 'external', 'docs'), { recursive: true });
        await writeFile(path.join(dir, 'external', 'docs', 'guide.pdf'), PDF_BYTES);
        await writeFile(path.join(dir, 'config', 'robots.txt'), 'User-agent: *\nDisallow:\n');

        await assetsStage(ctx);

        const robots = await readFile(path.join(ctx.outDir, 'robots.txt'), 'utf8');
        assert.match(robots, /User-agent/);
        const guide = await readFile(path.join(ctx.outDir, 'guide.pdf'));
        assert.deepEqual(guide, PDF_BYTES, 'external asset copied alongside robots.txt');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('assetsStage rejects a partial copy failure and removes the damaged output', async () => {
    const { ctx, dir } = await makeCtx();
    // Deterministic failure: monkey-patch `fs.copyFile` (on `node:fs.promises`,
    // the same object the stage imports — `node:fs/promises` namespace exports
    // are read-only, but `node:fs.promises` properties are writable) to reject
    // EIO for the one failing file. No chmod — which stays readable for
    // root/CI/permissive filesystems.
    const fs = await import('node:fs');
    const fsPromises = fs.promises;
    const realCopyFile = fsPromises.copyFile;
    const failSrc = path.join(dir, 'external', 'locked', 'secret.pdf');
    fsPromises.copyFile = ((src: unknown, dest: unknown, ...rest: unknown[]) => {
        if (src === failSrc) {
            const err: NodeJS.ErrnoException = new Error('EIO: read failed');
            err.code = 'EIO';
            return writeFile(String(dest), 'partial').then(() => { throw err; });
        }
        return (realCopyFile as Function)(src, dest, ...rest);
    }) as typeof fsPromises.copyFile;
    try {
        await writeFile(path.join(dir, 'config', 'external.json'), JSON.stringify(['https://github.com/nuckty/locked.git']));
        await mkdir(path.join(dir, 'external', 'locked'), { recursive: true });
        await writeFile(path.join(dir, 'external', 'locked', 'ok.pdf'), PDF_BYTES);
        await writeFile(failSrc, Buffer.from('secret'));

        await assert.rejects(async () => await assetsStage(ctx), /EIO/);
        await assert.rejects(() => readFile(path.join(ctx.outDir, 'secret.pdf')));
        assert.equal(ctx.store['assetRepos'], undefined);
    } finally {
        fsPromises.copyFile = realCopyFile;
        await rm(dir, { recursive: true, force: true });
    }
});

test('assetsStage with no external.json and no external/ dir reports empty repos', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await assetsStage(ctx);
        const repos = ctx.store['assetRepos'] as { available: string[]; missing: string[] };
        assert.deepEqual(repos.available, []);
        assert.deepEqual(repos.missing, []);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('assets use target config and reject linked destinations', async () => {
    const { ctx, dir } = await makeCtx();
    const { symlink } = await import('node:fs/promises');
    try {
        ctx.configDir = path.join(dir, 'target');
        await mkdir(ctx.configDir);
        await writeFile(path.join(ctx.configDir, 'site.json'), '{"bundles":[]}');
        await writeFile(path.join(ctx.configDir, 'external.json'), '[]');
        await writeFile(path.join(ctx.configDir, 'robots.txt'), 'TARGET');
        await writeFile(path.join(dir, 'config', 'robots.txt'), 'ROOT');
        await assetsStage(ctx);
        assert.equal(await readFile(path.join(ctx.outDir, 'robots.txt'), 'utf8'), 'TARGET');
        const outside = path.join(dir, 'sentinel.txt');
        await writeFile(outside, 'UNCHANGED');
        await rm(path.join(ctx.outDir, 'robots.txt'));
        await symlink(outside, path.join(ctx.outDir, 'robots.txt'));
        await assert.rejects(async () => await assetsStage(ctx), /symbolic link/);
        assert.equal(await readFile(outside, 'utf8'), 'UNCHANGED');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});
test('unsafe external names fail before cleaning or copying project-root files', async () => {
    const { ctx, dir } = await makeCtx();
    const { runBuild } = await import('./helpers/build.js');

    try {
        await mkdir(ctx.outDir);
        await writeFile(path.join(ctx.outDir, 'sentinel'), 'keep');
        await writeFile(path.join(dir, 'private.pdf'), 'OUTSIDE_EXTERNAL');
        await writeFile(path.join(dir, 'config/config-nuckty.ts'), "export default { targets: { main: { configDir: 'config', outDir: 'site' } } };");
        for (const url of [
            'https://fixture.invalid/org/..',
            'https://fixture.invalid/org/.',
            'https://fixture.invalid/org/',
            'https://fixture.invalid/org/repo\\nested',
            'https://fixture.invalid/org/repo\u0001',
            'https://user:SYNTHETIC_SECRET@fixture.invalid/org/..',
        ]) {
            await writeFile(path.join(dir, 'config/external.json'), JSON.stringify([url]));
            const rejected = (error: Error): boolean => {
                assert.match(error.message, /Unsafe external repository directory/);
                assert.doesNotMatch(error.message, /SYNTHETIC_SECRET/);

                return true;
            };

            await assert.rejects(async () => await assetsStage(ctx), rejected);
            await assert.rejects(() => runBuild({ cwd: dir, command: 'build' }), rejected);
        }
        assert.equal(await readFile(path.join(ctx.outDir, 'sentinel'), 'utf8'), 'keep');
        await assert.rejects(readFile(path.join(ctx.outDir, 'private.pdf')), { code: 'ENOENT' });
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

