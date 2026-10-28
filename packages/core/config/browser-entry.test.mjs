import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { Templates, render } from '../dist/index.js';

// Resolve the public subpath, not a source-tree path or a relative implementation.
const bundle = await build({
    stdin: {
        contents: "export { Templates, render, renderToHtml } from '@nuckty/core/browser';",
        resolveDir: new URL('..', import.meta.url).pathname,
    },
    bundle: true, write: false, platform: 'browser', format: 'esm', metafile: true,
});
const browser = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].contents).toString('base64'));

test('published browser entry bundles without external runtime dependencies', () => {
    assert.ok(Object.values(bundle.metafile.outputs).every((output) => output.imports.length === 0));
});

test('browser renderer matches the build renderer with templates and escaping', () => {
    for (const tree of [{ tag: 'p', content: '<script> & text' }, { block: 'card', content: [{ tag: 'h2', content: 'Title' }, { tag: 'p', content: 'Body' }] }, { tag: 'svg', content: { tag: 'path', attrs: { d: 'M0 0' } } }]) {
        const serverTemplates = new Templates();
        const browserTemplates = new browser.Templates();

        for (const templates of [serverTemplates, browserTemplates]) {
            templates.add({ block: 'card', modes: { tag: 'article' } });
        }

        assert.equal(browser.render(tree, { templates: browserTemplates }), render(tree, { templates: serverTemplates }));
    }
    assert.equal(browser.renderToHtml({ tag: 'p', content: 'Plain' }), '<p>Plain</p>');
});
