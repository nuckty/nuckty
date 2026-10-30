import assert from 'node:assert/strict';
import { test } from 'node:test';
import { promises as fs } from 'node:fs';
import { mkdtemp, mkdir, writeFile, readFile, symlink, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { cssStage } from '../stages/css.js';
import { jsStage } from '../stages/js.js';
import { imagesStage } from '../stages/images.js';
import { sitemapStage } from '../stages/sitemap.js';
import { NucktyEnv } from '../env/env.js';
import { Templates } from '../bem/templates.js';
import type { BuildContext } from '../pipeline/pipeline.js';

const cases = [
    { file: 'page.css', stage: cssStage, empty: false },
    { file: 'page-entry.js', stage: jsStage, empty: false },
    { file: 'image-mapping.json', stage: imagesStage, empty: false },
    { file: 'sitemap.json', stage: sitemapStage, empty: false },
];

for (const symbolicRoot of [false, true]) {
    for (const { file, stage, empty } of cases) {
        test(`build metadata ${file} empty=${empty} symbolicRoot=${symbolicRoot} preserves outside files`, async (t) => {
            const cwd = await mkdtemp(path.join(tmpdir(), 'nuckty-build-metadata-'));
            const buildDir = path.join(cwd, '.build');
            const workspace = symbolicRoot ? path.join(cwd, 'owned-workspace') : buildDir;
            const outDir = path.join(cwd, 'site');
            const outside = path.join(cwd, 'outside.txt');
            const marker = '{"keep":"OUTSIDE_SYNTHETIC"}';

            try {
                await mkdir(workspace);
                if (symbolicRoot) {
                    await symlink(workspace, buildDir);
                }
                await mkdir(path.join(cwd, 'config'));
                await mkdir(path.join(cwd, 'content'));
                await mkdir(path.join(cwd, 'blocks/widget'), { recursive: true });
                await writeFile(path.join(cwd, 'package.json'), '{}');
                await writeFile(path.join(cwd, 'config/site.json'), '{"bundles":["page"]}');
                await writeFile(path.join(cwd, 'config/levels.json'), '["content","blocks"]');
                await writeFile(path.join(cwd, 'config/sitemap.yml'), 'sitemap:\n  - Home [/, index.md]\n');
                await writeFile(path.join(cwd, 'content/index.md'), '# Safe');
                await writeFile(path.join(cwd, 'blocks/widget/widget.css'), '.widget{color:red}');
                await writeFile(path.join(cwd, 'blocks/widget/widget.js'), 'globalThis.safeWidget=1;');
                await writeFile(outside, marker);
                await symlink(outside, path.join(workspace, file));
                const context: BuildContext = {
                    cwd, configDir: path.join(cwd, 'config'), buildDir, outDir,
                    target: 'main', env: new NucktyEnv(), templates: new Templates(),
                    store: { blockDeps: { page: empty ? [] : ['widget'] } }, cache: new Map(),
                };
                const reads = t.mock.method(fs, 'readFile');

                await assert.rejects(async () => await stage(context), /symbolic link/);
                assert.equal(reads.mock.calls.some(call => path.basename(String(call.arguments[0])) === file), false);
                assert.equal(await readFile(outside, 'utf8'), marker);
                await rm(path.join(workspace, file));
                await stage(context);
                assert.ok((await readFile(path.join(workspace, file))).length > 0);
            } finally {
                await rm(cwd, { recursive: true, force: true });
            }
        });
    }
}

test('bundle metadata traversal fails before overwriting project files', async () => {
    const cwd = await mkdtemp(path.join(tmpdir(), 'nuckty-build-traversal-'));
    const buildDir = path.join(cwd, '.build');
    const outside = path.join(cwd, 'outside.css');

    try {
        await mkdir(buildDir);
        await mkdir(path.join(cwd, 'config'));
        await mkdir(path.join(cwd, 'blocks/widget'), { recursive: true });
        await writeFile(path.join(cwd, 'package.json'), '{}');
        await writeFile(path.join(cwd, 'config/site.json'), '{"bundles":["../outside"]}');
        await writeFile(path.join(cwd, 'blocks/widget/widget.css'), '.widget{color:red}');
        await writeFile(outside, 'KEEP');
        const context: BuildContext = {
            cwd, configDir: path.join(cwd, 'config'), buildDir, outDir: path.join(cwd, 'site'),
            target: 'main', env: new NucktyEnv(), templates: new Templates(),
            store: { blockDeps: { '../outside': ['widget'] } }, cache: new Map(),
        };

        await assert.rejects(async () => await cssStage(context), /escapes output/);
        assert.equal(await readFile(outside, 'utf8'), 'KEEP');
    } finally {
        await rm(cwd, { recursive: true, force: true });
    }
});

