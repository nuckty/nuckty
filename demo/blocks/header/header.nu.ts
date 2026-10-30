import { block, attributes, type BemNode, type DocumentData } from '@nuckty/core';
import { pageContext, type MessageKey } from '../root/root.page.js';

const NAVIGATION: Array<[MessageKey, string]> = [
    ['Features', '/'],
    ['Markdown', '/markdown'],
    ['Gallery and grid', '/media'],
    ['Editor', '/playground'],
    ['Files', '/output'],
];

function icon(paths: string[], mix: BemNode['mix']): BemNode {
    return {
        block: 'control-icon',
        mix,
        content: paths.map((d) => ({ block: 'control-icon', elem: 'path', props: { d } })),
    };
}

export default function templates(): void {
    block<DocumentData>('header')({
        tag: 'header',
        content: (node) => {
            const data = node.props;

            if (!data) {
                return null;
            }
            const { t, url, home } = pageContext(data);

            return [
                { block: 'brand', mods: { linked: !home }, props: data },
                {
                    block: 'header',
                    elem: 'nav',
                    props: { 'aria-label': t['Main navigation'] },
                    content: [
                        ...NAVIGATION.map(([label, href]) => ({
                            block: 'link',
                            mods: { current: href === url },
                            props: { href },
                            content: t[label],
                        })),
                        { block: 'link', props: { href: pageContext(data).siteUrl }, content: t['About nuckty ↗'] },
                    ],
                },
                { block: 'header', elem: 'tools', props: data },
            ];
        },
    });
    block('header').elem('nav')({
        tag: 'nav',
        attrs: (node, next) => ({ ...next(), id: 'main-nav', ...attributes(node, ['aria-label']) }),
    });
    block<DocumentData>('header').elem('tools')({
        tag: 'div',
        content: (node) => {
            const data = node.props;

            if (!data) {
                return null;
            }
            const { t, alternateUrl } = pageContext(data);

            return [
                { block: 'language-link', props: { href: alternateUrl }, content: t['RU'] },
                {
                    block: 'icon-button',
                    mix: [{ block: 'theme-toggle' }],
                    props: { 'aria-label': t['Dark theme'], hidden: true },
                    content: [
                        icon(['M20.6 13.5A8.5 8.5 0 0 1 10.5 3.4a8.5 8.5 0 1 0 10.1 10.1Z'], [{ block: 'theme-toggle', elem: 'moon' }]),
                        icon([
                            'M16 12a4 4 0 1 1 -8 0a4 4 0 0 1 8 0Z',
                            'M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
                        ], [{ block: 'theme-toggle', elem: 'sun' }]),
                    ],
                },
                {
                    block: 'icon-button',
                    mix: [{ block: 'menu-toggle' }],
                    props: { 'aria-label': t['Menu'], 'aria-controls': 'main-nav', 'aria-expanded': 'false', hidden: true },
                    content: { block: 'menu-toggle', elem: 'line', content: '' },
                },
            ];
        },
    });
}
