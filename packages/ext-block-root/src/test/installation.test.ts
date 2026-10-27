import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, realpath, rm, symlink } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NucktyEnv, Templates, render, runWithTemplates } from '@nuckty/core';
import type { DocumentData } from '@nuckty/core';

test('installed root package loads its template from a path with spaces and Unicode', async (t) => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'doc start with spaces – пример-'));
    t.after(async () => rm(cwd, { recursive: true, force: true }));

    const packageDir = path.join(cwd, 'node_modules', '@nuckty/ext-block-root');
    await mkdir(packageDir, { recursive: true });
    await symlink(fileURLToPath(new URL('../../../nuckty/', import.meta.url)), path.join(cwd, 'node_modules', '@nuckty', 'core'), 'dir');
    await cp(new URL('../../dist/', import.meta.url), path.join(packageDir, 'dist'), { recursive: true });
    await cp(new URL('../../blocks/', import.meta.url), path.join(packageDir, 'blocks'), { recursive: true });

    const installed = await import(pathToFileURL(path.join(packageDir, 'dist', 'index.js')).href) as typeof import('../index.js');
    const env = new NucktyEnv();
    env.levels.add('blocks');
    installed.register(env);
    const levels = env.levels.list();

    assert.equal(levels[1], `${await realpath(path.join(packageDir, 'blocks'))}${path.sep}`);

    const templates = new Templates();
    const root = await import(pathToFileURL(path.join(levels[1]!, 'root', 'root.nu.ts')).href) as { default: () => void };
    runWithTemplates(templates, root.default);
    const data: DocumentData = {
        page: { file: 'docs.md', url: '/docs', name: 'Docs', title: 'Installed root', section: null, breadcrumbs: [] },
        content: 'Loaded from installed package',
        sitemap: { sitemap: [], pages: {}, md2url: {}, md2urls: {}, url2md: {} },
        assets: { css: {}, js: {}, images: {}, videos: {} },
        alternates: new Map(),
    };
    const html = render({ block: 'root', props: { ...data }, content: data.content }, { templates, document: true });

    assert.ok(html.startsWith('<!doctype html>'));
    assert.ok(html.includes('<title>Installed root</title>'));
    assert.ok(html.includes('Loaded from installed package'));
});
