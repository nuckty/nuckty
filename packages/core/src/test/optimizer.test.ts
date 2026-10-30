import { test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../bem/render.js';
import { Templates } from '../bem/templates.js';
import type { BEMTree } from '../bem/types.js';

const TEMPLATES = { templates: new Templates() };

function r(tree: BEMTree): string {
    return render(tree, TEMPLATES);
}

test('rule 9-11: single-token class unquoted', () => {
    assert.equal(r({ block: 'page' }), '<div class=page></div>');
});

test('rule 10: multi-token class quoted (space)', () => {
    assert.equal(r({ block: 'page', mods: { theme: 'dark' } }), '<div class="page page_theme_dark"></div>');
});

test('rule 10: comma in value does NOT force quotes (no other special char)', () => {
    // Value with comma but no space/=/<>/quotes → unquoted (comma alone is legal).
    assert.equal(
        r({ tag: 'meta', attrs: { name: 'viewport,content' } }),
        '<meta name=viewport,content>',
    );
});

test('rule 10: value with `=` still quoted (HTML5 requires it)', () => {
    // `width=device-width,initial-scale=1` contains `=` → must be quoted.
    assert.equal(
        r({ tag: 'meta', attrs: { content: 'width=device-width,initial-scale=1' } }),
        '<meta content="width=device-width,initial-scale=1">',
    );
});

test('rule 9: empty value quoted', () => {
    assert.equal(r({ tag: 'img', attrs: { alt: '' } }), '<img alt="">');
});

test('rule 8: boolean attribute bare', () => {
    assert.equal(
        r({ tag: 'input', attrs: { type: 'checkbox', checked: true } }),
        '<input type=checkbox checked>',
    );
});

test('rule 6: void element no closing tag, no />', () => {
    assert.equal(r({ tag: 'br' }), '<br>');
    assert.equal(r({ tag: 'img', attrs: { src: '/x.png', alt: 'pic' } }), '<img src=/x.png alt=pic>');
});

test('rule 13: html/head/body close never emitted', () => {
    const doc = {
        tag: 'html',
        attrs: { lang: 'ru' },
        content: [
            { tag: 'meta', attrs: { charset: 'utf-8' } },
            { tag: 'body', attrs: { class: 'page' }, content: 'hi' },
        ],
    };
    assert.equal(r(doc), '<html lang=ru><meta charset=utf-8><body class=page>hi');
});

test('rule 14: ordinary lists omit eligible item end tags', () => {
    const list = {
        tag: 'ul',
        content: [
            { tag: 'li', content: 'a' },
            { tag: 'li', content: 'b' },
            { tag: 'li', content: 'c' },
        ],
    };
    assert.equal(r(list), '<ul><li>a<li>b<li>c</ul>');
});

test('rule 14: article lists use the same HTML omission rules', () => {
    const list = {
        tag: 'ul',
        block: 'article',
        elem: 'list',
        content: [
            { tag: 'li', block: 'article', elem: 'list-item', content: 'a' },
            { tag: 'li', block: 'article', elem: 'list-item', content: 'b' },
            { tag: 'li', block: 'article', elem: 'list-item', content: 'c' },
        ],
    };
    assert.equal(
        r(list),
        '<ul class=article__list><li class=article__list-item>a<li class=article__list-item>b<li class=article__list-item>c</ul>',
    );
});

test('rule 15-16: ordinary table cell and row closes can be omitted', () => {
    const table = {
        tag: 'table',
        content: [
            {
                tag: 'tbody',
                content: [
                    { tag: 'tr', content: [{ tag: 'td', content: '1' }, { tag: 'td', content: '2' }] },
                ],
            },
        ],
    };
    assert.equal(r(table), '<table><tr><td>1<td>2</table>');
});

test('rule 19: </p> omitted before a permitted block sibling', () => {
    const div = {
        tag: 'div',
        content: [
            { tag: 'p', content: 'first' },
            { tag: 'div', content: 'second' },
        ],
    };
    assert.equal(r(div), '<div><p>first<div>second</div></div>');
});

test('rule 19: </p> kept before inline/text sibling', () => {
    const div = {
        tag: 'div',
        content: [
            { tag: 'p', content: 'first' },
            'text after',
        ],
    };
    // text follows → </p> emitted; text is escaped as-is.
    assert.equal(r(div), '<div><p>first</p>text after</div>');
});

test('rule 19: </p> omitted at the end of an eligible HTML parent', () => {
    const div = { tag: 'div', content: [{ tag: 'p', content: 'only' }] };
    assert.equal(r(div), '<div><p>only</div>');
});

test('rule 21: no whitespace between elements', () => {
    assert.equal(
        r({ tag: 'div', content: [{ tag: 'span', content: 'a' }, { tag: 'span', content: 'b' }] }),
        '<div><span>a</span><span>b</span></div>',
    );
});

test('raw pass-through verbatim (rule 25)', () => {
    assert.equal(
        r({ tag: 'div', raw: '<span>raw & unescaped</span>' }),
        '<span>raw & unescaped</span>',
    );
});

test('text content: & < > are entity-escaped', () => {
    assert.equal(r('a < b > c & d'), 'a &lt; b &gt; c &amp; d');
});

test('attribute value with quotes is entity-escaped', () => {
    // Raw `"` inside a double-quoted attribute terminates it early — the
    // serializer emits `&quot;` so the logical value survives HTML parsing.
    assert.equal(
        r({ tag: 'a', attrs: { title: 'say "hi"' } }),
        '<a title="say &quot;hi&quot;"></a>',
    );
});

test('document mode prepends <!doctype html> and appends \\n\\n', () => {
    // Document-level render emits `<!doctype html>` as the first bytes and
    // terminates with `\n\n`. div is not an omissible-close tag → close emitted.
    const html = render({ block: 'p' }, { ...TEMPLATES, document: true });
    assert.equal(html, '<!doctype html><div class=p></div>\n\n');
});

test('cyrillic in attribute unquoted', () => {
    assert.equal(
        r({ tag: 'a', attrs: { href: '#топливо' } }),
        '<a href=#топливо></a>',
    );
});

test('rule 7: svg void-shaped children self-close inside svg context', () => {
    // Inside <svg>, void-shaped children (<path>, <circle>, ...) with no
    // content emit `/>` (rule 7). d="M0 0" contains a space → quoted.
    const svg = {
        tag: 'svg',
        attrs: { viewBox: '0 0 10 10', fill: 'none' },
        content: [{ tag: 'path', attrs: { d: 'M0 0' } }],
    };
    assert.equal(r(svg), '<svg viewBox="0 0 10 10" fill=none><path d="M0 0"/></svg>');
});

test('rule 7: svg path with content keeps open/close', () => {
    // A <path> with text content (rare but legal) uses normal open/close.
    const svg = {
        tag: 'svg',
        content: [{ tag: 'path', content: 'x' }],
    };
    assert.equal(r(svg), '<svg><path>x</path></svg>');
});

test('rule 7: svg self-close does not leak outside svg', () => {
    // Outside svg, <path> (if it ever appeared) keeps its closing tag.
    const doc = { tag: 'div', content: [{ tag: 'path', attrs: { d: 'M0 0' } }] };
    assert.equal(r(doc), '<div><path d="M0 0"></path></div>');
});

test('all attribute escape characters retain their logical representation', () => {
    assert.equal(r({ tag: 'i', attrs: { title: 'A > B < C & "yes"' } }), '<i title="A &gt; B &lt; C &amp; &quot;yes&quot;"></i>');
    assert.equal(r({ block: 'x', js: { value: '>' } }), '<div class=x data-bem="{&quot;x&quot;:{&quot;value&quot;:&quot;&gt;&quot;}}"></div>');
});

test('list items close before script, text and raw siblings', () => {
    for (const middle of [{ tag: 'script', attrs: { type: 'application/json' }, content: '{}' }, 'text', { raw: '<script type=application/json>{}</script>' }]) {
        const html = r({ tag: 'ul', content: [{ tag: 'li', content: 'a' }, middle, { tag: 'li', content: 'b' }] });
        assert.ok(html.startsWith('<ul><li>a</li>'), html);
    }
});

test('nested fragments retain list parent and lookahead across fragment boundaries', () => {
    assert.equal(r({ tag: 'ul', content: [[{ tag: false, content: [{ tag: 'li', content: 'a' }] }], { tag: 'script', content: '{}' }, [{ tag: 'li', content: 'b' }]] }), '<ul><li>a</li><script>{}</script><li>b</ul>');
});

test('SVG foreignObject switches descendants back to HTML serialization', () => {
    assert.equal(r({ tag: 'svg', content: { tag: 'foreignObject', content: [{ tag: 'path' }, { tag: 'svg', content: { tag: 'path' } }] } }), '<svg><foreignObject><path></path><svg><path/></svg></foreignObject></svg>');
});

test('mix-only nodes produce classes and bem false suppresses BEM mix but preserves cls', () => {
    assert.equal(r({ mix: { block: 'mixed', mods: { active: true } } }), '<div class="mixed mixed_active"></div>');
    assert.equal(r({ block: 'x', bem: false, mix: { block: 'mixed' }, cls: 'custom', js: true }), '<div class=custom></div>');
});
test('table head closes before direct body rows', () => {
    assert.equal(r({ tag: 'table', content: [
        { tag: 'thead', content: { tag: 'tr', content: { tag: 'th', content: 'HEAD' } } },
        { tag: 'tr', content: { tag: 'td', content: 'BODY' } },
    ] }), '<table><thead><tr><th>HEAD</thead><tr><td>BODY</table>');
});

test('table cells close before script and raw comment siblings through fragments', () => {
    assert.equal(r({ tag: 'table', content: { tag: 'tbody', content: { tag: 'tr', content: [
        { tag: 'td', content: 'A' },
        [{ tag: false, content: { tag: 'script', content: { raw: 'void 0;' } } }],
        { tag: 'th', content: 'B' },
        { raw: '<!--cell-gap-->' },
        { tag: 'td', content: 'C' },
    ] } } }), '<table><tr><td>A</td><script>void 0;</script><th>B</th><!--cell-gap--><td>C</table>');
});

test('table rows close before literal comment siblings', () => {
    assert.equal(r({ tag: 'table', content: { tag: 'tbody', content: [
        { tag: 'tr', content: { tag: 'td', content: 'A' } },
        { raw: '<!--row-gap-->' },
        { tag: 'tr', content: { tag: 'td', content: 'B' } },
    ] } }), '<table><tr><td>A</tr><!--row-gap--><tr><td>B</table>');
});

test('table sections close before literal whitespace and comment siblings', () => {
    assert.equal(r({ tag: 'table', content: [
        { tag: 'thead', content: { tag: 'tr', content: { tag: 'th', content: 'H' } } },
        ' ',
        { tag: 'tbody', content: { tag: 'tr', content: { tag: 'td', content: 'A' } } },
        { raw: '<!--group-gap-->' },
        { tag: 'tfoot', content: { tag: 'tr', content: { tag: 'td', content: 'T' } } },
        ' ',
    ] }), '<table><thead><tr><th>H</thead> <tr><td>A</tbody><!--group-gap--><tfoot><tr><td>T</tfoot> </table>');
});

test('document wrapper ends preserve opaque comment sibling positions', () => {
    const tree: BEMTree = [
        { tag: 'html', content: [
            { tag: 'head', content: { tag: 'title', content: 'T' } },
            { raw: '<!--after-head-->' },
            { tag: 'body', content: 'X' },
            { raw: '<!--after-body-->' },
        ] },
        { raw: '<!--after-root-->' },
    ];

    assert.equal(render(tree, { ...TEMPLATES, document: true }), '<!doctype html><title>T</title></head><!--after-head-->X</body><!--after-body--></html><!--after-root-->\n\n');
});

test('head closes before literal whitespace outside its content', () => {
    assert.equal(r({ tag: 'html', content: [
        { tag: 'head', content: { tag: 'title', content: 'T' } },
        ' ',
        { tag: 'body', content: 'X' },
    ] }), '<title>T</title></head> X');
});

test('HTML tag and boolean-attribute matching is ASCII case insensitive', () => {
    assert.equal(r({ tag: 'IMG', attrs: { src: '/image.png' } }), '<IMG src=/image.png>');
    assert.equal(r({ tag: 'INPUT', attrs: { DISABLED: 'disabled' } }), '<INPUT DISABLED>');
    assert.equal(r({ tag: 'UL', content: [{ tag: 'LI', content: 'A' }, { tag: 'LI', content: 'B' }] }), '<UL><LI>A<LI>B</UL>');
});

test('mixed-case SVG syntax retains foreignObject HTML boundaries', () => {
    assert.equal(r({ tag: 'SVG', content: [
        { tag: 'PATH', attrs: { d: 'M0 0' } },
        { tag: 'FOREIGNOBJECT', content: [{ tag: 'PATH' }, { tag: 'SVG', content: { tag: 'PATH' } }] },
    ] }), '<SVG><PATH d="M0 0"/><FOREIGNOBJECT><PATH></PATH><SVG><PATH/></SVG></FOREIGNOBJECT></SVG>');
});

test('name matching does not fold non-ASCII attribute names into booleans', () => {
    assert.equal(r({ tag: 'input', attrs: { 'checKed': 'custom' } }), '<input checKed=custom>');
});
