import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadBlocks } from '../blocks/loader.js';
import { render } from '../bem/render.js';
import { Templates } from '../bem/templates.js';
import { readBemDeclaration } from '../blocks/bemdecl.js';

async function fixture(source: string): Promise<{ dir: string; templates: Templates }> {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-block-loader-'));
    const blockDir = path.join(dir, 'blocks', 'card');

    await mkdir(blockDir, { recursive: true });
    await writeFile(
        path.join(blockDir, 'card.bemdecl.js'),
        "module.exports = ['card'];\n",
    );
    await writeFile(path.join(blockDir, 'card.nu.ts'), source);

    return { dir, templates: new Templates() };
}

test('block loader invokes default templates() in the active collection', async () => {
    const api = pathToFileURL(path.resolve(import.meta.dirname, '../bem/api.ts')).href;
    const { dir, templates } = await fixture(
        `import { block } from '${api}';\n` +
        "export default function templates() { block('card')({ tag: 'article' }); }\n",
    );

    try {
        await loadBlocks(templates, dir, ['blocks'], ['card']);

        assert.equal(render({ block: 'card' }, { templates }), '<article class=card></article>');
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('block loader rejects a module without default templates()', async () => {
    const { dir, templates } = await fixture('export const value = 1;\n');

    try {
        await assert.rejects(
            () => loadBlocks(templates, dir, ['blocks'], ['card']),
            /must export default templates/,
        );
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('existing invalid BEM declarations fail with their path instead of losing the bundle', async () => {
    const { dir } = await fixture('export default function templates() {}');
    const declaration = path.join(dir, 'blocks/card/card.bemdecl.js');

    try {
        for (const source of ['module.exports = [;', 'module.exports = [42];', 'module.exports = { mustDeps: 42 };']) {
            await writeFile(declaration, source);
            assert.throws(() => readBemDeclaration('card', dir, ['blocks']), /invalid BEM declaration.*card\.bemdecl\.js/);
        }
        assert.deepEqual(readBemDeclaration('missing', dir, ['blocks']), []);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('later BEM declaration levels override blocks and normalize object dependencies', async () => {
    const { dir } = await fixture('export default function templates() {}');

    try {
        await mkdir(path.join(dir, 'override/card'), { recursive: true });
        await writeFile(path.join(dir, 'override/card/card.bemdecl.js'), "module.exports = { mustDeps: [{ block: 'other' }], shouldDeps: ['other', 'last'] };\n");
        assert.deepEqual(readBemDeclaration('card', dir, ['blocks', 'override']), ['other', 'last']);
        assert.deepEqual(readBemDeclaration('card', dir, ['blocks', 'absent']), ['card']);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});

test('object declarations expand elem and elems into element entities', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'nuckty-bemdecl-elems-'));
    try {
        await mkdir(path.join(dir, 'blocks', 'page'), { recursive: true });
        await writeFile(path.join(dir, 'blocks', 'package.json'), JSON.stringify({ type: 'commonjs' }));
        await writeFile(path.join(dir, 'blocks', 'page', 'page.bemdecl.js'), "module.exports = ['root', { block: 'menu', elem: 'item' }, { block: 'nav', elems: ['link', 'icon'] }, { block: 'card', elem: ['title', 'body'] }];\n");
        assert.deepEqual(readBemDeclaration('page', dir, ['blocks']), ['root', 'menu__item', 'nav', 'nav__link', 'nav__icon', 'card__title', 'card__body']);

        await writeFile(path.join(dir, 'blocks', 'page', 'page.bemdecl.js'), "module.exports = [{ block: 'menu', mods: { theme: 'dark' } }];\n");
        assert.throws(() => readBemDeclaration('page', dir, ['blocks']), /Unknown dependency field "mods"/);
    } finally {
        await rm(dir, { recursive: true, force: true });
    }
});
