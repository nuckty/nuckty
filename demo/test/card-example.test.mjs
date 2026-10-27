import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build, transform } from 'esbuild';
import { render, runWithTemplates, Templates } from '@nuckty/core';

const bundle = await build({
    entryPoints: ['blocks/playground/card-example.ts'],
    bundle: true, write: false, platform: 'browser', format: 'esm',
});
const { cardExample } = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].contents).toString('base64'));
const templateSource = (await readFile('blocks/card/card.nu.ts', 'utf8')).replace("'@nuckty/core'", JSON.stringify(import.meta.resolve('@nuckty/core')));
const compiled = await transform(templateSource, { loader: 'ts', format: 'esm' });
const { default: cardTemplates } = await import('data:text/javascript;base64,' + Buffer.from(compiled.code).toString('base64'));

for (const [lang, directory] of [['ru', 'site'], ['en', 'site-en']]) {
    test(`${lang}: hero source and rendered card match the initial editor example`, async () => {
        const html = await readFile(`${directory}/html/index.html`, 'utf8');
        const code = html.slice(html.indexOf('id=demo-card-source')).match(/<code>([\s\S]*?)<\/code>/)[1].replace(/<[^>]+>/g, '');
        const source = code.replace(/&(quot|amp|lt|gt|#39);/g, (_, entity) => ({ quot: '"', amp: '&', lt: '<', gt: '>', '#39': "'" })[entity]);
        const tree = cardExample(lang);
        assert.deepEqual(JSON.parse(source), tree);
        const templates = new Templates();
        runWithTemplates(templates, cardTemplates);
        assert.ok(html.includes(render(tree, { templates })), 'static card must be actual template output');
        assert.match(html, /id=playground(?:\s|>)/);
        assert.match(html, /id=playground-preview[^>]*sandbox=""/);
        assert.doesNotMatch(html, /class=toc(?:\s|>)/);
    });
}
