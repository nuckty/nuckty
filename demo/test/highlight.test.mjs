import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Templates, render, runWithTemplates } from '@nuckty/core';
import { bundle } from './bundle.mjs';

const { highlightCode, register, codeTemplates } = await bundle("export { highlightCode, register } from './ext/highlight.ts'; export { default as codeTemplates } from './blocks/code/code.nu.ts';");

const templates = new Templates();
runWithTemplates(templates, codeTemplates);

const decode = (html) => html.replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|#39);/g, (_, entity) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[entity]));

test('tokens are code elements that preserve text and escape markup', () => {
    for (const [language, source] of [['ts', 'const node = { text: "<script>&" };\n'], ['html', '<article class=card>Hello</article>\n'], ['yaml', 'name: nuckty\n'], ['shell', 'npm install ./packages/nuckty.tgz\n']]) {
        const html = render(highlightCode(source, language), { templates });
        assert.equal(decode(html), source);
        assert.match(html, /<span class="code__token code__token_kind_[a-z]+">/);
        assert.ok(!html.includes('<script>'));
        assert.ok(!html.includes('style='));
    }
    assert.equal(render(highlightCode('<b>literal</b>', 'unknown-language'), { templates }), '&lt;b&gt;literal&lt;/b&gt;');
});

test('fenced HTML code opts into soft wrapping without changing its text', () => {
    let handler;
    register({ markdown: { node(type, value) { assert.equal(type, 'code'); handler = value; } } });
    const source = '<article data-title="A long title">Content & more</article>';
    const htmlCode = render(handler({ type: 'code', lang: 'html', value: source }, {}), { templates });
    assert.match(htmlCode, /^<pre class="code code_wrap_soft article__code"><code>/);
    assert.equal(decode(htmlCode), source + '\n');
    assert.doesNotMatch(render(handler({ type: 'code', lang: 'ts', value: 'const value = 1;' }, {}), { templates }), /code_wrap_soft/);
});
