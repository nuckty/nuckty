import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, realpath, rm, symlink } from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { NucktyEnv, Templates, render, runWithTemplates } from '@nuckty/core';

test('installed grid template and resource load from a path with spaces and Unicode', async (t) => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'doc start with spaces – пример-'));
    t.after(async () => rm(cwd, { recursive: true, force: true }));

    const packageDir = path.join(cwd, 'node_modules', '@nuckty/ext-block-grid');
    await mkdir(packageDir, { recursive: true });
    await symlink(fileURLToPath(new URL('../../../nuckty/', import.meta.url)), path.join(cwd, 'node_modules', '@nuckty', 'core'), 'dir');
    await cp(new URL('../../dist/', import.meta.url), path.join(packageDir, 'dist'), { recursive: true });
    await cp(new URL('../../blocks/', import.meta.url), path.join(packageDir, 'blocks'), { recursive: true });

    const installed = await import(pathToFileURL(path.join(packageDir, 'dist', 'index.js')).href) as typeof import('../index.js');
    const env = new NucktyEnv();
    env.levels.add('blocks');
    installed.register(env);
    const levels = env.levels.list();
    const installedBlocks = levels[1]!;
    assert.equal(installedBlocks, `${await realpath(path.join(packageDir, 'blocks'))}${path.sep}`);

    const templates = new Templates();
    const grid = await import(pathToFileURL(path.join(installedBlocks, 'grid', 'grid.nu.ts')).href) as { default: () => void };
    runWithTemplates(templates, grid.default);
    const html = render({ block: 'grid', content: [{ block: 'grid', elem: 'item', tag: 'div', content: 'Installed cell' }] }, { templates });
    const css = await readFile(path.join(installedBlocks, 'grid', 'grid.css'), 'utf8');

    assert.ok(html.includes('class=grid'));
    assert.ok(html.includes('grid__item'));
    assert.ok(html.includes('Installed cell'));
    assert.ok(css.includes('.grid'));
});
