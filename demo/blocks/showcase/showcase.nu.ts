import { messages } from './showcase.i18n/index.js';
import { highlightCode } from '../../ext/highlight.js';
import { cardExample } from '../playground/card-example.js';
import { b, attributes } from '../bem/bem.js';
import { block, type BEMTree, type BemNode } from '@nuckty/core';

const arrow = (): BemNode => b('demo-arrow', undefined, b('showcase', 'arrow-path'));
function showcaseContent(
    node: Omit<BemNode, 'props'> & {
        props?: {
            lang?: string;
            gallery?: BEMTree;
            grid?: BEMTree;
        };
    },
): BEMTree {
    const locale = node.props?.lang;
    const t = messages(locale);
    const card = cardExample(locale ?? 'ru');
    const source = JSON.stringify(card, null, 2).replace(
        /\{\n\s+"elem": ("[^"]+"),\n\s+"content": (".*")\n\s+}/g,
        '{"elem": $1, "content": $2}',
    );
    const examples = [
        ['Markdown', t['Text, tables, links and task lists.'], '/markdown'],
        [t['Gallery and grid'], t['Images, a lightbox and content layout.'], '/media'],
        [t['nu.ts templates'], t['Rules for blocks and modifiers.'], '/playground'],
        [t['Build files'], t['HTML, assets and compressed copies.'], '/output'],
    ];
    return [
        b('demo-hero', undefined, [
            b(
                'demo-hero',
                'name',
                [
                    b('showcase', 'title', [b('showcase', 'text', 'nuckty'), ' ', b('showcase', 'text', 'demo')]),
                    b('showcase', 'paragraph', t['Change the content. Follow a tree of blocks as it becomes a page.']),
                    b('demo-hero', 'meta', [
                        b('showcase', 'text', 'BEMJSON → nu → HTML'),
                        b('showcase', 'link', t['Open source ↗'], {
                            href: 'https://github.com/nuckty/nuckty-demo',
                        }),
                    ]),
                ],
                {},
                { mix: [{ block: 'demo-tile' }] },
            ),
            b(
                'demo-hero',
                'source',
                [
                    b(
                        'showcase',
                        'caption',
                        [b('showcase', 'text', 'card.bemjson'), b('showcase', 'text', 'BEMJSON')],
                        {},
                        { mix: [{ block: 'demo-fragment' }] },
                    ),
                    b('showcase', 'snippet', b('showcase', 'code', { raw: highlightCode(source, 'json') })),
                    b(
                        'showcase',
                        'paragraph',
                        t['Content, as a tree of blocks.'],
                        {},
                        { mix: [{ block: 'demo-fragment' }] },
                    ),
                ],
                {},
                { mix: [{ block: 'demo-tile' }] },
            ),
            b(
                'demo-hero',
                'output',
                [
                    b(
                        'showcase',
                        'panel',
                        [b('showcase', 'text', t['The rendered block']), b('showcase', 'text', 'HTML')],
                        {},
                        { mix: [{ block: 'demo-fragment' }] },
                    ),
                    b('demo-hero', 'sample', [b('demo-hero', 'glyph', '{ }'), card]),
                    b(
                        'showcase',
                        'panel',
                        [
                            b('showcase', 'text', t['Same content. Your markup.']),
                            b('showcase', 'link', t['Try changing it ↓'], { href: '#playground' }),
                        ],
                        {},
                        { mix: [{ block: 'demo-fragment' }] },
                    ),
                ],
                {},
                { mix: [{ block: 'demo-tile' }] },
            ),
            b(
                'demo-hero',
                'statement',
                [
                    b('showcase', 'heading', t['Text and blocks.']),
                    b(
                        'showcase',
                        'paragraph',
                        t['Markdown for content. TypeScript for templates. HTML for the reader.'],
                    ),
                ],
                {},
                { mix: [{ block: 'demo-tile' }] },
            ),
            b(
                'demo-hero',
                'start',
                [
                    b('showcase', 'text', t['Your content. Your markup.']),
                    arrow(),
                    b('showcase', 'text', t['Try the editor']),
                ],
                {},
                { mix: [{ block: 'demo-tile' }] },
            ),
        ]),
        b(
            'demo-nav',
            undefined,
            examples.map(([title, text, href]) =>
                b(
                    'demo-nav',
                    'link',
                    [b('showcase', 'heading', title ?? ''), b('showcase', 'paragraph', text ?? ''), arrow()],
                    { href: href ?? '/' },
                    { mix: [{ block: 'demo-tile' }] },
                ),
            ),
            { 'aria-label': t['Detailed examples'] },
        ),
        b('demo-workbench', undefined, [
            b('demo-section-heading', undefined, [
                b('showcase', 'heading', t['Try a block.']),
                b(
                    'showcase',
                    'paragraph',
                    t[
                        'Choose an example or edit the BEMJSON. The real nuckty engine applies templates and shows the HTML.'
                    ],
                ),
            ]),
            { block: 'playground', mods: { compact: true }, props: { lang: node.props?.lang } },
            b(
                'demo-workbench',
                'note',
                t['The example runs in your browser. The preview opens in a separate sandboxed document.'],
            ),
        ]),
        b('demo-proof', undefined, [
            b('demo-section-heading', undefined, [
                b('showcase', 'heading', t['Extensions in action.']),
                b('text-link', undefined, t['Gallery and grid ↗']),
            ]),
            b('demo-proof', 'grid', [
                b(
                    'demo-proof',
                    'sample',
                    [
                        b('showcase', 'subheading', t['Gallery']),
                        b('showcase', 'paragraph', t['Select an image to open the lightbox.']),
                        node.props?.gallery ?? null,
                    ],
                    {},
                    { mix: [{ block: 'demo-tile' }] },
                ),
                b(
                    'demo-proof',
                    'sample',
                    [
                        b('showcase', 'subheading', t['Grid']),
                        b('showcase', 'paragraph', t['Each Markdown paragraph becomes a cell.']),
                        node.props?.grid ?? null,
                    ],
                    {},
                    { mix: [{ block: 'demo-tile' }] },
                ),
            ]),
        ]),
        b('demo-note', undefined, [
            b('demo-tile', undefined, [
                b('showcase', 'heading', t['The website is an example too.']),
                b(
                    'showcase',
                    'paragraph',
                    t['Every page is built with nuckty. Content, templates, CSS and JavaScript live in the project.'],
                ),
            ]),
            b(
                'demo-note',
                'link',
                [
                    b('showcase', 'text', t['Inspect build files']),
                    arrow(),
                    b('showcase', 'text', t['Sizes and hashes of the current files']),
                ],
                {},
                { mix: [{ block: 'demo-tile' }] },
            ),
        ]),
    ];
}

export default function templates(): void {
    block('showcase').elem('arrow-path')({
        tag: 'path',
        attrs: (node, next) => ({ d: 'M5 19 19 5M5 5h14v14', ...next(), ...attributes(node, ['d']) }),
    });
    block('showcase').elem('text')({
        tag: 'span',
    });
    block('showcase').elem('title')({
        tag: 'h1',
    });
    block('showcase').elem('paragraph')({
        tag: 'p',
    });
    block('showcase').elem('link')({
        tag: 'a',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['href']) }),
    });
    block('showcase').elem('caption')({
        tag: 'figcaption',
    });
    block('showcase').elem('code')({
        tag: 'code',
    });
    block('showcase').elem('snippet')({
        tag: 'pre',
    });
    block('showcase').elem('panel')({
        tag: 'div',
    });
    block('showcase').elem('heading')({
        tag: 'h2',
    });
    block('showcase').elem('subheading')({
        tag: 'h3',
    });
    block('showcase')({
        tag: 'div',
    });
    block<{ lang?: string; gallery?: import('@nuckty/core').BEMTree; grid?: import('@nuckty/core').BEMTree }>(
        'showcase',
    ).when((node) => Boolean(node.props))({ content: showcaseContent });
}
