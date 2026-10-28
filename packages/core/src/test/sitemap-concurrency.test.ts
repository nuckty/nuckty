import { test } from 'node:test';
import assert from 'node:assert/strict';
import cp from 'node:child_process';
import { promisify } from 'node:util';
import { syncBuiltinESMExports } from 'node:module';
import { mkdir, writeFile, mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

test('sitemap bounds Git queries while preserving every page and timestamp', async () => {
    let active = 0;
    let peak = 0;
    let calls = 0;
    const original = cp.execFile;
    const measured = Object.assign(original.bind(cp), {
        [promisify.custom]: async (_file: string, args: string[]) => {
            assert.ok(args.includes('--format=%ct'), 'only timestamp queries are stubbed');
            calls += 1;
            active += 1;
            peak = Math.max(peak, active);
            await new Promise((resolve) => setTimeout(resolve, 20));
            active -= 1;

            return { stdout: '1672617600\n', stderr: '' };
        },
    });
    const root = await mkdtemp(path.join(tmpdir(), 'nuckty-sitemap-concurrency-'));
    try {
        cp.execFile = measured;
        syncBuiltinESMExports();
        const { runBuild } = await import('./helpers/build.js');
        await mkdir(path.join(root, 'config'));
        await mkdir(path.join(root, 'content'));
        await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
        await writeFile(path.join(root, 'config/config-nuckty.ts'), "export default {targets:{default:{configDir:'config',outDir:'site'}},ext:['./document.mjs']};");
        await writeFile(path.join(root, 'config/site.json'), '{"bundles":[]}');
        await writeFile(path.join(root, 'config/levels.json'), '["content"]');
        await writeFile(path.join(root, 'document.mjs'), "export default env => env.document.register(data => ({tag:'p',content:data.content}));");
        let sitemap = 'sitemap:\n';
        for (let index = 0; index < 24; index += 1) {
            sitemap += `  - Page ${index} [/p${index}, p${index}.md]\n`;
            await writeFile(path.join(root, `content/p${index}.md`), `# Page ${index}`);
        }
        await writeFile(path.join(root, 'config/sitemap.yml'), sitemap);
        await runBuild({ cwd: root, command: 'build' });
        const output = JSON.parse(await readFile(path.join(root, '.build/sitemap.json'), 'utf8')) as { pages: Record<string, { lastUpdated: string }> };
        assert.equal(calls, 24);
        assert.ok(peak > 1 && peak <= 8, `expected bounded concurrency; observed ${peak}`);
        assert.equal(active, 0);
        assert.equal(Object.keys(output.pages).length, 24);
        assert.ok(Object.values(output.pages).every((page) => page.lastUpdated === '02.01.2023 03:00 GMT+03'));
        await rm(path.join(root, 'content/p0.md'));
        calls = 0;
        await assert.rejects(runBuild({ cwd: root, command: 'build' }), /ENOENT/);
        assert.equal(active, 0, 'a failed build must settle in-flight queries before returning');
        assert.ok(calls < 24, 'a failed build must stop taking queued pages');
    } finally {
        cp.execFile = original;
        syncBuiltinESMExports();
        await rm(root, { recursive: true, force: true });
    }
});

