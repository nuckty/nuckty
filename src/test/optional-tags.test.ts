import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parse, parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import { renderToHtml } from '../bem/render-to-html.js';
import { serialize } from '../bem/html/serialize.js';
import type { BemNode, BEMTree } from '../bem/types.js';

type ParsedNode = DefaultTreeAdapterMap['node'];

function snapshot(node: ParsedNode): unknown {
    if ('value' in node) {
        return { name: node.nodeName, text: node.value };
    }
    if ('data' in node) {
        return { name: node.nodeName, comment: node.data };
    }

    return {
        name: node.nodeName,
        namespace: 'namespaceURI' in node ? node.namespaceURI : undefined,
        attrs: 'attrs' in node ? [...node.attrs].sort((a, b) => a.name.localeCompare(b.name)) : undefined,
        children: 'childNodes' in node ? node.childNodes.map(snapshot) : undefined,
        template: 'content' in node ? snapshot(node.content) : undefined,
    };
}

function equivalent(tree: BEMTree, document = false): string {
    const actual = renderToHtml(tree, { document });
    const explicit = document ? `<!doctype html>${serialize(tree)}\n\n` : serialize(tree);
    const parser = document ? parse : parseFragment;

    assert.deepEqual(snapshot(parser(actual)), snapshot(parser(explicit)), actual);

    return actual;
}

const title: BemNode = { tag: 'title', content: 'T' };
function doc(body: BemNode, head: BemNode = { tag: 'head', content: title }): BemNode {
    return { tag: 'html', content: [head, body] };
}

const positive: Array<[string, BEMTree, string]> = [
    ['ordinary list', { tag: 'ul', content: [{ tag: 'li', content: 'A' }, { tag: 'li', content: 'B' }] }, '<ul><li>A<li>B</ul>'],
    ['menu list', { tag: 'menu', content: [{ tag: 'li', content: 'A' }] }, '<menu><li>A</menu>'],
    ['definitions', { tag: 'dl', content: [{ tag: 'dt', content: 'A' }, { tag: 'dd', content: 'B' }, { tag: 'dt', content: 'C' }, { tag: 'dd', content: 'D' }] }, '<dl><dt>A<dd>B<dt>C<dd>D</dl>'],
    ['grouped definitions', { tag: 'dl', content: { tag: 'div', content: [{ tag: 'dt', content: 'A' }, { tag: 'dd', content: 'B' }] } }, '<dl><div><dt>A<dd>B</div></dl>'],
    ['ruby', { tag: 'ruby', content: ['漢', { tag: 'rp', content: '(' }, { tag: 'rt', content: 'kan' }, { tag: 'rp', content: ')' }] }, '<ruby>漢<rp>(<rt>kan<rp>)</ruby>'],
    ['options', { tag: 'select', content: [{ tag: 'option', content: 'A' }, { tag: 'option', content: 'B' }] }, '<select><option>A<option>B</select>'],
    ['option groups', { tag: 'select', content: [{ tag: 'optgroup', attrs: { label: 'A' }, content: { tag: 'option', content: 'One' } }, { tag: 'optgroup', attrs: { label: 'B' }, content: { tag: 'option', content: 'Two' } }] }, '<select><optgroup label=A><option>One<optgroup label=B><option>Two</select>'],
    ['option separator', { tag: 'select', content: [{ tag: 'option', content: 'A' }, { tag: 'hr' }, { tag: 'option', content: 'B' }] }, '<select><option>A<hr><option>B</select>'],
    ['group separator', { tag: 'select', content: [{ tag: 'optgroup', attrs: { label: 'A' }, content: { tag: 'option', content: 'One' } }, { tag: 'hr' }, { tag: 'option', content: 'Two' }] }, '<select><optgroup label=A><option>One<hr><option>Two</select>'],
    ['data list', { tag: 'datalist', content: [{ tag: 'option', attrs: { value: 'A' } }, { tag: 'option', attrs: { value: 'B' } }] }, '<datalist><option value=A><option value=B></datalist>'],
    ['table wrappers', { tag: 'table', content: [{ tag: 'caption', content: 'Caption' }, { tag: 'colgroup', content: [{ tag: 'col' }, { tag: 'col' }] }, { tag: 'tbody', content: { tag: 'tr', content: [{ tag: 'td', content: 'A' }, { tag: 'td', content: 'B' }] } }] }, '<table><caption>Caption<col><col><tr><td>A<td>B</table>'],
    ['adjacent column groups', { tag: 'table', content: [{ tag: 'colgroup', content: { tag: 'col' } }, { tag: 'colgroup', content: { tag: 'col' } }] }, '<table><col><colgroup><col></table>'],
    ['adjacent row groups', { tag: 'table', content: [{ tag: 'tbody', content: { tag: 'tr', content: { tag: 'td', content: 'A' } } }, { tag: 'tbody', content: { tag: 'tr', content: { tag: 'td', content: 'B' } } }] }, '<table><tr><td>A<tbody><tr><td>B</table>'],
    ['head then body row groups', { tag: 'table', content: [{ tag: 'thead', content: { tag: 'tr', content: { tag: 'th', content: 'H' } } }, { tag: 'tbody', content: { tag: 'tr', content: { tag: 'td', content: 'A' } } }, { tag: 'tfoot', content: { tag: 'tr', content: { tag: 'td', content: 'F' } } }] }, '<table><thead><tr><th>H<tbody><tr><td>A<tfoot><tr><td>F</table>'],
];

for (const [name, tree, expected] of positive) {
    test(`optional tags: ${name} minimize without changing the parsed tree`, () => {
        assert.equal(equivalent(tree), expected);
    });
}

test('optional wrappers: html, head and body omit only attribute-free starts', () => {
    assert.equal(equivalent(doc({ tag: 'body', content: { tag: 'p', content: 'B' } }), true), '<!doctype html><title>T</title><p>B</p>\n\n');
    const tree = doc({ tag: 'body', attrs: { id: '', 'data-value': 'x&y' }, cls: 'page', content: 'B' });
    tree.attrs = { lang: 'en' };
    const html = equivalent(tree, true);

    assert.match(html, /<html lang=en>/);
    assert.match(html, /<body class=page id="" data-value=x&amp;y>/);
    for (const tag of ['head', 'body']) {
        const attributed: BemNode = { tag, attrs: { id: 'keep' }, block: 'metadata', js: { enabled: true }, content: tag === 'head' ? title : 'B' };
        const value = equivalent(tag === 'head' ? doc({ tag: 'body', content: 'B' }, attributed) : doc(attributed), true);

        assert.match(value, new RegExp(`<${tag} class=metadata id=keep data-bem=`));
    }
});

test('optional wrappers: empty body still places document newlines in body', () => {
    equivalent(doc({ tag: 'body' }), true);
    equivalent({ tag: 'html' }, true);
});

test('optional body start remains before metadata, comments and initial whitespace', () => {
    for (const first of [
        ...['meta', 'link', 'script', 'style', 'noscript', 'template'].map((tag) => ({ tag })),
        { raw: '<!--inside-body-->' }, ' ', '\n',
    ] satisfies BEMTree[]) {
        assert.ok(equivalent(doc({ tag: 'body', content: [first, { tag: 'div', content: 'B' }] }), true).includes('<body>'));
    }
});

test('optional html start and wrapper ends preserve comment ownership through whitespace', () => {
    const tree: BEMTree = [
        { tag: 'html', content: [{ raw: '<!--inside-html-->' }, { tag: 'head', content: title }, ' ', { tag: 'body', content: 'B' }, ' ', { raw: '<!--after-body-->' }] },
        '\n', { raw: '<!--after-html-->' },
    ];
    const html = equivalent(tree, true);

    assert.match(html, /<html><!--inside-html-->/);
    assert.match(html, /<\/body> <!--after-body-->/);
    assert.match(html, /<\/html>\n<!--after-html-->/);
});

test('optional table starts retain attributes and separate groups after literal boundaries', () => {
    for (const tag of ['colgroup', 'tbody']) {
        const content: BemNode = tag === 'colgroup' ? { tag: 'col' } : { tag: 'tr', content: { tag: 'td', content: 'A' } };
        const attributed: BemNode = { tag, attrs: { id: '' }, cls: 'keep', content };
        const html = equivalent({ tag: 'table', content: [attributed, { raw: '<!--between-->' }, { tag, content }] });

        assert.match(html, new RegExp(`<${tag} class=keep id="">`));
        assert.match(html, new RegExp(`</${tag}><!--between-->`));
    }
    for (const content of [null, [], '', { raw: '<!--not-an-element-->' }, [' ', { tag: 'col' }]] satisfies BEMTree[]) {
        assert.ok(equivalent({ tag: 'table', content: { tag: 'colgroup', content } }).includes('<colgroup>'));
    }
});

test('optional ends preserve text/comment siblings through arrays and tag-false fragments', () => {
    const cases: Array<[string, string, string]> = [['ul', 'li', 'li'], ['dl', 'dd', 'dt'], ['ruby', 'rt', 'rp'], ['select', 'option', 'option'], ['table', 'caption', 'tbody']];

    for (const [parent, tag, peer] of cases) {
        for (const gap of [' ', '\n', { raw: '<!--gap-->' }] satisfies BEMTree[]) {
            const sibling: BemNode = peer === 'tbody' ? { tag: peer, content: { tag: 'tr', content: { tag: 'td', content: 'B' } } } : { tag: peer, content: 'B' };
            const tree: BemNode = { tag: parent, content: [{ tag, content: 'A' }, ['', null, { tag: false, content: [gap, sibling] }]] };
            const html = equivalent(tree);

            assert.ok(html.includes(`</${tag}>`), html);
        }
    }
});

test('optional HTML rules stay out of SVG/MathML and resume at integration points', () => {
    for (const tree of [
        { tag: 'svg', content: { tag: 'foreignObject', content: { tag: 'ul', content: [{ tag: 'li', content: 'A' }, { tag: 'li', content: 'B' }] } } },
        { tag: 'math', content: { tag: 'mtext', content: { tag: 'div', content: { tag: 'p', content: 'A' } } } },
        { tag: 'math', content: { tag: 'annotation-xml', attrs: { encoding: 'text/html' }, content: { tag: 'ul', content: { tag: 'li', content: 'A' } } } },
        { tag: 'svg', content: { tag: 'title', content: { tag: 'p', content: 'A' } } },
        { tag: 'math', content: { tag: 'mtext', content: [{ tag: 'mglyph', attrs: { src: '/g.png', alt: 'g' } }, { tag: 'malignmark' }, { tag: 'span', content: 'A' }] } },
        { tag: 'math', content: { tag: 'annotation-xml', content: { tag: 'svg', content: { tag: 'foreignObject', content: { tag: 'div', content: { tag: 'p', content: 'A' } } } } } },
    ] satisfies BEMTree[]) {
        equivalent(tree);
    }
    assert.equal(renderToHtml({ tag: 'math', content: { tag: 'p', content: 'A' } }), '<math><p>A</p></math>');
});

test('optional definition and ruby peer combinations preserve parsed grouping', () => {
    for (const tag of ['dt', 'dd']) {
        for (const next of ['dt', 'dd']) {
            equivalent({ tag: 'dl', content: [{ tag, content: 'A' }, { tag: next, content: 'B' }, { tag: 'dd', content: 'C' }] });
        }
    }
    for (const tag of ['rt', 'rp']) {
        for (const next of ['rt', 'rp']) {
            const html = equivalent({ tag: 'ruby', content: ['漢', { tag, content: 'A' }, { tag: next, content: 'B' }] });

            assert.ok(!html.includes(`</${tag}>`), html);
        }
    }
    equivalent({ tag: 'select', content: [{ tag: 'option', content: 'A' }, { tag: 'optgroup', attrs: { label: 'B' }, content: { tag: 'option', content: 'B' } }] });
});

test('optional table starts handle closed peers, empty groups and opaque predecessors', () => {
    equivalent({ tag: 'table', content: [{ tag: 'thead', content: { tag: 'tr', content: { tag: 'th', content: 'H' } } }, ' ', { tag: 'tbody', content: { tag: 'tr', content: { tag: 'td', content: 'B' } } }] });
    for (const tag of ['colgroup', 'tbody']) {
        const first: BemNode = tag === 'colgroup' ? { tag: 'col' } : { tag: 'tr', content: { tag: 'td', content: 'B' } };

        for (const gap of [' ', { raw: '<!--group-boundary-->' }] satisfies BEMTree[]) {
            equivalent({ tag: 'table', content: [{ tag, content: first }, gap, { tag, content: first }] });
        }
        assert.ok(equivalent({ tag: 'table', content: [{ raw: '<caption>Raw caption</caption>' }, { tag, content: first }] }).includes(`<${tag}>`));
        for (const content of [null, [], '', { raw: '<!--first-->' }, [' ', first]] satisfies BEMTree[]) {
            assert.ok(equivalent({ tag: 'table', content: { tag, content } }).includes(`<${tag}>`));
        }
        const html = equivalent({ tag: 'table', content: { tag, block: 'group', js: { value: '"<&' }, content: first } });

        assert.ok(html.includes(`<${tag} class=group data-bem=`), html);
    }
});

test('optional wrappers preserve raw input and leading root comments after whitespace', () => {
    equivalent({ tag: 'html', content: [' \n', { raw: '<!--root-comment-->' }, { tag: 'head', content: title }, { tag: 'body', content: 'B' }] }, true);
    const raw = '<head><title>Raw</title></head>';
    const html = equivalent({ tag: 'html', content: [{ raw }, { tag: 'body', content: { raw: '<div>Raw body</div>' } }] }, true);

    assert.ok(html.includes(raw));
    assert.ok(html.includes('<body><div>Raw body</div>'));
    for (const attrs of [{ id: undefined }, { id: null }, { hidden: false }]) {
        const tree = doc({ tag: 'body', attrs, content: 'B' }, { tag: 'head', attrs, content: title });
        tree.attrs = attrs;
        assert.ok(!equivalent(tree, true).includes('<html'));
    }
});

test('optional names match ASCII case while mandatory and unknown-parent ends remain', () => {
    assert.equal(equivalent({ tag: 'UL', content: [{ tag: 'LI', content: 'A' }, { tag: 'LI', content: 'B' }] }), '<UL><LI>A<LI>B</UL>');
    for (const tag of ['li', 'dt', 'dd', 'rt', 'rp', 'option', 'optgroup', 'caption', 'colgroup', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th']) {
        assert.ok(renderToHtml({ tag, content: 'A' }).endsWith(`</${tag}>`), tag);
    }
    for (const tag of ['a', 'span', 'div', 'section', 'button', 'script', 'style', 'title']) {
        assert.ok(equivalent({ tag, content: 'A' }).endsWith(`</${tag}>`), tag);
    }
});

test('optional wrappers round-trip all whitespace/comment boundary combinations', () => {
    const gaps: BEMTree[] = ['', ' ', '\n', { raw: '<!--boundary-->' }];

    for (const beforeHead of gaps) {
        for (const afterHead of gaps) {
            for (const afterBody of gaps) {
                for (const afterRoot of gaps) {
                    equivalent([
                        { tag: 'html', content: [beforeHead, { tag: 'head', content: title }, afterHead, { tag: 'body', content: { tag: 'p', content: 'B' } }, afterBody] },
                        afterRoot,
                    ], true);
                }
            }
        }
    }
});

test('adjacent table groups round-trip every attribute and separator combination', () => {
    for (const tag of ['colgroup', 'tbody']) {
        for (const firstAttrs of [undefined, { id: 'first' }]) {
            for (const secondAttrs of [undefined, { id: 'second' }]) {
                for (const gap of ['', ' ', { raw: '<!--between-groups-->' }] satisfies BEMTree[]) {
                    const content: BemNode = tag === 'colgroup' ? { tag: 'col' } : { tag: 'tr', content: { tag: 'td', content: 'B' } };
                    const first: BemNode = { tag, content };
                    const second: BemNode = { tag, content };

                    if (firstAttrs) {
                        first.attrs = firstAttrs;
                    }
                    if (secondAttrs) {
                        second.attrs = secondAttrs;
                    }
                    equivalent({ tag: 'table', content: [first, gap, second] });
                }
            }
        }
    }
});

test('optional option/group ends also work through nested select containers', () => {
    const tree: BemNode = { tag: 'select', content: { tag: 'div', content: [
        { tag: 'optgroup', attrs: { label: 'A' }, content: { tag: 'div', content: [{ tag: 'option', content: 'One' }, { tag: 'option', content: 'Two' }] } },
        { tag: 'optgroup', attrs: { label: 'B' }, content: { tag: 'option', content: 'Three' } },
    ] } };
    const html = equivalent(tree);

    assert.ok(!html.includes('</option>'));
    assert.ok(!html.includes('</optgroup>'));
});
