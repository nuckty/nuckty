/**
 * Branch-coverage tests for the images stage (`imagesStage`) — exercises every
 * supported source format (PNG, JPEG, GIF, SVG, WebP) with observable file-and-
 * mapping assertions: mapping keys, physical output directories, content-hash
 * stability, and format metadata. Also locks duplicate-basename, duplicate-
 * content, unsupported-file, missing-directory, and read/write-failure
 * behavior, and proves a processing failure cannot silently produce a mapping
 * entry pointing at a missing output file.
 *
 * @module test/images-stage
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { imagesStage } from '../stages/images.js';
import { NucktyEnv } from '../env/env.js';
import type { BuildContext } from '../pipeline/pipeline.js';
import { generateHash } from '../utils/hash.js';

// Minimal valid binary fixtures (not real images, but stable byte sequences
// the stage hashes and copies — the engine only hashes/copies, it does not
// decode raster content).
const PNG_BYTES = Buffer.from(
    '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63600100000005000156fed98a0000000049454e44ae426082',
    'hex',
);
const JPEG_BYTES = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0xff, 0xd9]);
const GIF_BYTES = Buffer.from('47494638396101000100800000ffffff00000021f90401000000002c00000000010001000002024401003b', 'hex');
const WEBP_BYTES = Buffer.from('RIFF\x10\x00\x00\x00WEBPVP8 ', 'latin1');
const SVG_BYTES = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"><rect/></svg>', 'utf8');

/** Build a temp project + BuildContext for the images stage. */
async function makeCtx(
    overrides: Partial<BuildContext> = {},
): Promise<{ ctx: BuildContext; dir: string }> {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-images-'));
    await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'img-fixture', type: 'module' }));
    await mkdir(path.join(dir, 'config'), { recursive: true });
    await writeFile(path.join(dir, 'config', 'levels.json'), JSON.stringify(['content', 'blocks']));
    await writeFile(path.join(dir, 'config', 'site.json'), '{"bundles":[]}');
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

test('imagesStage: PNG is copied to site/png/ and mapped to _i<hash>', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await mkdir(path.join(dir, 'content', 'logo'), { recursive: true });
        await writeFile(path.join(dir, 'content', 'logo', 'logo.png'), PNG_BYTES);

        await imagesStage(ctx);

        const mapping = ctx.store.imageMapping!;
        const ref = mapping['logo/logo.png'];
        assert.ok(ref);
        assert.match(ref, /^_i[a-f0-9]{16}$/, 'raster ref uses _i<hash>');
        const hash = generateHash(Buffer.concat([Buffer.from(`.png\0${PNG_BYTES.length}\0`), PNG_BYTES]));
        // Physical file in site/png/<hash>.png.
        const out = await readFile(path.join(ctx.outDir, 'png', `${hash}.png`));
        assert.deepEqual(out, PNG_BYTES, 'png bytes preserved');
        const stats = ctx.store.imageStats!;
        const entry = stats[`${hash}.png`];
        assert.ok(entry, 'stats keyed by <hash>.<ext>');
        assert.equal(entry!.format, 'png');
        assert.equal(entry!.hash, hash);
        assert.equal(entry!.ref, ref);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('imagesStage: JPEG is copied to site/jpg/ and stats report format jpg', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await mkdir(path.join(dir, 'content', 'photo'), { recursive: true });
        await writeFile(path.join(dir, 'content', 'photo', 'photo.jpg'), JPEG_BYTES);

        await imagesStage(ctx);

        const hash = generateHash(Buffer.concat([Buffer.from(`.jpg\0${JPEG_BYTES.length}\0`), JPEG_BYTES]));
        const out = await readFile(path.join(ctx.outDir, 'jpg', `${hash}.jpg`));
        assert.deepEqual(out, JPEG_BYTES, 'jpg bytes preserved');
        const stats = ctx.store.imageStats!;
        assert.equal(stats[`${hash}.jpg`]!.format, 'jpg');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('imagesStage: JPEG with .jpeg extension is copied to site/jpg/', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await mkdir(path.join(dir, 'content', 'pic'), { recursive: true });
        await writeFile(path.join(dir, 'content', 'pic', 'pic.jpeg'), JPEG_BYTES);

        await imagesStage(ctx);

        const hash = generateHash(Buffer.concat([Buffer.from(`.jpeg\0${JPEG_BYTES.length}\0`), JPEG_BYTES]));
        const out = await readFile(path.join(ctx.outDir, 'jpg', `${hash}.jpeg`));
        assert.deepEqual(out, JPEG_BYTES, '.jpeg bytes preserved in jpg/ subdir');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('imagesStage: GIF is copied to site/ root (no dedicated subdir for gif)', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await mkdir(path.join(dir, 'content', 'anim'), { recursive: true });
        await writeFile(path.join(dir, 'content', 'anim', 'anim.gif'), GIF_BYTES);

        await imagesStage(ctx);

        const hash = generateHash(Buffer.concat([Buffer.from(`.gif\0${GIF_BYTES.length}\0`), GIF_BYTES]));
        const mapping = ctx.store.imageMapping!;
        assert.ok(mapping['anim/anim.gif'], 'gif mapped');
        // outputSubdirFor('.gif') falls through to the site root.
        const out = await readFile(path.join(ctx.outDir, `${hash}.gif`));
        assert.deepEqual(out, GIF_BYTES, 'gif copied to site root');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('imagesStage: SVG is copied to site/svg/ and mapped to <hash>.svg', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await mkdir(path.join(dir, 'content', 'icon'), { recursive: true });
        await writeFile(path.join(dir, 'content', 'icon', 'icon.svg'), SVG_BYTES);

        await imagesStage(ctx);

        const hash = generateHash(SVG_BYTES);
        const mapping = ctx.store.imageMapping!;
        assert.equal(mapping['icon/icon.svg'], `${hash}.svg`, 'svg ref uses <hash>.svg');
        const out = await readFile(path.join(ctx.outDir, 'svg', `${hash}.svg`));
        assert.deepEqual(out, SVG_BYTES, 'svg bytes preserved');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('imagesStage: WebP is copied to site/webp/ and mapped to _i<hash>', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await mkdir(path.join(dir, 'content', 'hero'), { recursive: true });
        await writeFile(path.join(dir, 'content', 'hero', 'hero.webp'), WEBP_BYTES);

        await imagesStage(ctx);

        const hash = generateHash(Buffer.concat([Buffer.from(`.webp\0${WEBP_BYTES.length}\0`), WEBP_BYTES]));
        const out = await readFile(path.join(ctx.outDir, 'webp', `${hash}.webp`));
        assert.deepEqual(out, WEBP_BYTES, 'webp bytes preserved in webp/ subdir');
        const mapping = ctx.store.imageMapping!;
        assert.ok(mapping['hero/hero.webp']);
        assert.match(mapping['hero/hero.webp'], /^_i[a-f0-9]{16}$/);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('imagesStage: a pre-rendered .webp sibling is copied to site/webp/ with the hash', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await mkdir(path.join(dir, 'content', 'shot'), { recursive: true });
        await writeFile(path.join(dir, 'content', 'shot', 'shot.png'), PNG_BYTES);
        // A pre-rendered modern sibling named shot.webp next to shot.png.
        const webpSibling = Buffer.from('RIFF\x10\x00\x00\x00WEBPVP8 X', 'latin1');
        await writeFile(path.join(dir, 'content', 'shot', 'shot.webp'), webpSibling);

        await imagesStage(ctx);

        const hash = generateHash(Buffer.concat([Buffer.from(`.png\0${PNG_BYTES.length}\0`), PNG_BYTES, Buffer.from(`webp\0${webpSibling.length}\0`), webpSibling]));
        // The sibling is copied under the ORIGINAL's hash name.
        const out = await readFile(path.join(ctx.outDir, 'webp', `${hash}.webp`));
        assert.deepEqual(out, webpSibling, 'webp sibling copied under the png hash');
        const stats = ctx.store.imageStats!;
        assert.equal(stats[`${hash}.png`]!.webp, true, 'stats flag the webp sibling as present');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('imagesStage: a pre-rendered .avif sibling is copied to site/avif/', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await mkdir(path.join(dir, 'content', 'art'), { recursive: true });
        await writeFile(path.join(dir, 'content', 'art', 'art.jpg'), JPEG_BYTES);
        const avifSibling = Buffer.from('\x00\x00\x00 ftypavif', 'latin1');
        await writeFile(path.join(dir, 'content', 'art', 'art.avif'), avifSibling);

        await imagesStage(ctx);

        const hash = generateHash(Buffer.concat([Buffer.from(`.jpg\0${JPEG_BYTES.length}\0`), JPEG_BYTES, Buffer.from(`avif\0${avifSibling.length}\0`), avifSibling]));
        const out = await readFile(path.join(ctx.outDir, 'avif', `${hash}.avif`));
        assert.deepEqual(out, avifSibling, 'avif sibling copied under the jpg hash');
        const stats = ctx.store.imageStats!;
        assert.equal(stats[`${hash}.jpg`]!.avif, true, 'stats flag the avif sibling as present');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('imagesStage: hashes are stable — identical content produces the same output name', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await mkdir(path.join(dir, 'content', 'a'), { recursive: true });
        await mkdir(path.join(dir, 'content', 'b'), { recursive: true });
        // Same bytes in two locations → same hash, one physical file (dedup).
        await writeFile(path.join(dir, 'content', 'a', 'x.png'), PNG_BYTES);
        await writeFile(path.join(dir, 'content', 'b', 'y.png'), PNG_BYTES);

        await imagesStage(ctx);

        const hash = generateHash(Buffer.concat([Buffer.from(`.png\0${PNG_BYTES.length}\0`), PNG_BYTES]));
        const mapping = ctx.store.imageMapping!;
        assert.equal(mapping['a/x.png'], mapping['b/y.png'], 'identical content → identical ref');
        assert.equal(mapping['a/x.png'], `_i${hash}`);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('imagesStage: duplicate basenames in different dirs map to distinct keys', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await mkdir(path.join(dir, 'content', 'one'), { recursive: true });
        await mkdir(path.join(dir, 'content', 'two'), { recursive: true });
        // Same basename, different content → different hashes, both copied.
        await writeFile(path.join(dir, 'content', 'one', 'logo.png'), PNG_BYTES);
        await writeFile(path.join(dir, 'content', 'two', 'logo.png'), JPEG_BYTES);

        await imagesStage(ctx);

        const mapping = ctx.store.imageMapping!;
        assert.notEqual(mapping['one/logo.png'], mapping['two/logo.png'], 'same basename, distinct refs');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('imagesStage: unsupported extensions (.ico, .bmp) are not collected', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await mkdir(path.join(dir, 'content', 'fav'), { recursive: true });
        await writeFile(path.join(dir, 'content', 'fav', 'favicon.ico'), Buffer.from([0x00, 0x00, 0x01, 0x00]));
        await writeFile(path.join(dir, 'content', 'fav', 'wallpaper.bmp'), Buffer.from('BM'));

        await imagesStage(ctx);

        const mapping = ctx.store.imageMapping!;
        assert.ok(!mapping['fav/favicon.ico'], '.ico not collected');
        assert.ok(!mapping['fav/wallpaper.bmp'], '.bmp not collected');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('imagesStage: images inside hidden and dependency directories are not collected', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        for (const hidden of ['.git', '.venv', 'node_modules/pkg']) {
            await mkdir(path.join(dir, 'content', hidden), { recursive: true });
            await writeFile(path.join(dir, 'content', hidden, 'x.png'), PNG_BYTES);
        }
        await writeFile(path.join(dir, 'content', 'kept.png'), PNG_BYTES);

        await imagesStage(ctx);

        assert.deepEqual(Object.keys(ctx.store.imageMapping!), ['kept.png']);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('imagesStage: a missing levels directory is skipped without failing', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        // levels.json lists a directory that does not exist on disk.
        await writeFile(path.join(dir, 'config', 'levels.json'), JSON.stringify(['content', 'nonexistent']));
        await mkdir(path.join(dir, 'content', 'ok'), { recursive: true });
        await writeFile(path.join(dir, 'content', 'ok', 'ok.png'), PNG_BYTES);

        await imagesStage(ctx);

        const mapping = ctx.store.imageMapping!;
        assert.ok(mapping['ok/ok.png'], 'present level still processed');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('imagesStage: a read failure does not produce a mapping entry pointing at a missing file', async () => {
    const { ctx, dir } = await makeCtx();
    // Deterministic failure: monkey-patch `fs.readFile` (on `node:fs.promises`,
    // the same object the stage imports — `node:fs/promises` namespace exports
    // are read-only, but `node:fs.promises` properties are writable) to reject
    // ENOENT for the one fixture file, so its source read fails on every
    // platform (no chmod, which stays readable for root/CI/permissive fs).
    const fs = await import('node:fs');
    const fsPromises = fs.promises;
    const realReadFile = fsPromises.readFile;
    const brokenPath = path.join(dir, 'content', 'broken', 'locked.png');
    let failurePath = brokenPath;
    fsPromises.readFile = ((p: unknown, ...rest: unknown[]) => {
        if (p === failurePath) {
            const err: NodeJS.ErrnoException = new Error('ENOENT: no such file');
            err.code = 'ENOENT';
            return Promise.reject(err);
        }
        return (realReadFile as Function)(p, ...rest);
    }) as typeof fsPromises.readFile;
    try {
        await mkdir(path.join(dir, 'content', 'broken'), { recursive: true });
        await writeFile(brokenPath, PNG_BYTES);
        failurePath = await fsPromises.realpath(brokenPath);

        await assert.rejects(async () => await imagesStage(ctx), /ENOENT/);
        assert.equal(ctx.store.imageMapping, undefined);
        // And no physical output file exists for it.
        const hash = generateHash(Buffer.concat([Buffer.from(`.png\0${PNG_BYTES.length}\0`), PNG_BYTES]));
        await assert.rejects(() => readFile(path.join(ctx.outDir, 'png', `${hash}.png`)),
            'no output file for the failed image');
    } finally {
        fsPromises.readFile = realReadFile;
        await rm(dir, { recursive: true, force: true });
    }
});

test('imagesStage: scans multiple levels and dedups by hash across them', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        // Two levels both carrying the same PNG — the second is a re-declaration
        // of the same block; dedup keeps one physical file.
        await mkdir(path.join(dir, 'content', 'img'), { recursive: true });
        await mkdir(path.join(dir, 'blocks', 'img'), { recursive: true });
        await writeFile(path.join(dir, 'content', 'img', 'dup.png'), PNG_BYTES);
        await writeFile(path.join(dir, 'blocks', 'img', 'dup.png'), PNG_BYTES);

        await imagesStage(ctx);

        const hash = generateHash(Buffer.concat([Buffer.from(`.png\0${PNG_BYTES.length}\0`), PNG_BYTES]));
        const stats = ctx.store.imageStats!;
        assert.ok(stats[`${hash}.png`], 'one physical file for identical cross-level content');
        const mapping = ctx.store.imageMapping!;
        // Both relative paths map to the same ref.
        assert.equal(mapping['img/dup.png'], `_i${hash}`);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('images use target config, absolute levels and deterministic last-level override', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        const first = path.join(dir, 'first');
        const last = path.join(dir, 'last');
        await mkdir(first);
        await mkdir(last);
        await writeFile(path.join(first, 'x.png'), 'FIRST');
        await writeFile(path.join(last, 'x.png'), 'LAST');
        ctx.configDir = path.join(dir, 'target-config');
        await mkdir(ctx.configDir);
        await writeFile(path.join(ctx.configDir, 'site.json'), '{"bundles":[]}');
        await writeFile(path.join(ctx.configDir, 'levels.json'), JSON.stringify([first, last]));
        await imagesStage(ctx);
        const mapping = ctx.store.imageMapping!;
        const hash = mapping['x.png']!.slice(2);
        assert.equal(await readFile(path.join(ctx.outDir, 'png', `${hash}.png`), 'utf8'), 'LAST');
        assert.deepEqual(Object.keys(mapping), ['x.png']);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('image references change with variants and distinguish different original formats', async () => {
    const { ctx, dir } = await makeCtx();
    try {
        await mkdir(path.join(dir, 'content'));
        await writeFile(path.join(dir, 'content', 'x.png'), PNG_BYTES);
        await writeFile(path.join(dir, 'content', 'x.jpg'), PNG_BYTES);
        await writeFile(path.join(dir, 'content', 'x.avif'), 'FIRST');
        await imagesStage(ctx);
        const first = ctx.store.imageMapping!;
        assert.notEqual(first['x.png'], first['x.jpg']);
        await writeFile(path.join(dir, 'content', 'x.avif'), 'OTHER');
        await imagesStage(ctx);
        const second = ctx.store.imageMapping!;
        assert.notEqual(first['x.png'], second['x.png']);
        assert.equal(await readFile(path.join(ctx.outDir, 'avif', `${second['x.png']!.slice(2)}.avif`), 'utf8'), 'OTHER');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('images reject a linked output format directory', async () => {
    const { ctx, dir } = await makeCtx();
    const { symlink } = await import('node:fs/promises');
    try {
        await mkdir(ctx.outDir, { recursive: true });
        const outside = path.join(dir, 'outside');
        await mkdir(outside);
        await writeFile(path.join(outside, 'sentinel'), 'UNCHANGED');
        await symlink(outside, path.join(ctx.outDir, 'png'));
        await assert.rejects(async () => await imagesStage(ctx), /symbolic link/);
        assert.equal(await readFile(path.join(outside, 'sentinel'), 'utf8'), 'UNCHANGED');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

for (const format of ['avif', 'webp']) {
    test(`image family refuses outside ${format} aliases before reading bytes`, async (t) => {
        const { ctx, dir } = await makeCtx();
        const { symlink } = await import('node:fs/promises');
        const nodeFs = await import('node:fs');

        try {
            await mkdir(path.join(dir, 'content'));
            await writeFile(path.join(dir, 'content/a.png'), PNG_BYTES);
            await writeFile(path.join(dir, 'outside.json'), 'OUTSIDE_SYNTHETIC');
            await symlink(path.join(dir, 'outside.json'), path.join(dir, `content/a.${format}`));
            const reads = t.mock.method(nodeFs.promises, 'readFile');

            await assert.rejects(async () => await imagesStage(ctx), /escapes image source level/);
            assert.equal(reads.mock.calls.some(call => path.basename(String(call.arguments[0])) === 'outside.json'), false);
            assert.equal(ctx.store.imageMapping, undefined);
        } finally {
            await rm(dir, { recursive: true, force: true });
        }
    });
}

test('image family preserves inside variant aliases under a symbolic source root', async () => {
    const { ctx, dir } = await makeCtx();
    const { symlink } = await import('node:fs/promises');

    try {
        await mkdir(path.join(dir, 'real-content'));
        await symlink(path.join(dir, 'real-content'), path.join(dir, 'content'));
        await writeFile(path.join(dir, 'real-content/a.png'), PNG_BYTES);
        await writeFile(path.join(dir, 'real-content/inside.dat'), 'INSIDE_SYNTHETIC');
        await symlink('inside.dat', path.join(dir, 'real-content/a.webp'));
        await imagesStage(ctx);
        const mapping = ctx.store.imageMapping!;
        const hash = mapping['a.png']!.slice(2);

        assert.equal(await readFile(path.join(ctx.outDir, 'webp', `${hash}.webp`), 'utf8'), 'INSIDE_SYNTHETIC');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});
