import { test } from 'node:test';
import assert from 'node:assert/strict';
import { highlightCode } from '../ext/highlight.ts';

const decode = (html) => html.replace(/<[^>]*>/g, '').replace(/&(amp|lt|gt|quot|#39);/g, (_, entity) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[entity]));

test('static tokens preserve text and escape markup', () => {
    for (const [language, source] of [['ts', 'const node = { text: "<script>&" };\n'], ['html', '<article class=card>Hello</article>\n'], ['yaml', 'name: nuckty\n'], ['shell', 'npm install ./packages/nuckty.tgz\n']]) {
        const html = highlightCode(source, language);
        assert.equal(decode(html), source);
        assert.match(html, /class="th-token th-/);
        assert.ok(!html.includes('<script>'));
        assert.ok(!html.includes('style='));
    }
    assert.equal(highlightCode('<b>literal</b>', 'unknown-language'), '&lt;b&gt;literal&lt;/b&gt;');
});

