import { block, attributes, type DocumentData } from '@nuckty/core';
import { pageContext } from '../root/root.page.js';

export default function templates(): void {
    block<DocumentData>('footer')({
        tag: 'footer',
        content: (node) => {
            const data = node.props;

            if (!data) {
                return null;
            }
            const { t, home } = pageContext(data);

            return [
                { block: 'demo-wordmark', content: [...'nuckty'].map((letter) => ({ block: 'footer', elem: 'letter', content: letter })) },
                {
                    block: 'footer',
                    elem: 'identity',
                    content: [
                        { block: 'footer', elem: 'brand', elemMods: { linked: !home }, props: data },
                        {
                            block: 'footer',
                            elem: 'caption',
                            content: [{ block: 'footer', elem: 'made', content: t['Made with nuckty.'] }, { block: 'footer', elem: 'break' }, t['Of course']],
                        },
                    ],
                },
                {
                    block: 'footer',
                    elem: 'links',
                    props: { 'aria-label': t['More links'] },
                    content: [
                        { block: 'link', props: { href: 'https://github.com/nuckty/nuckty' }, content: 'GitHub' },
                        {
                            block: 'source-link',
                            props: { href: `https://github.com/nuckty/nuckty/blob/main/demo/content/${data.page.file}`, 'aria-label': t['Page source on GitHub'] },
                            content: t['Page source'],
                        },
                        { block: 'footer', elem: 'license', content: 'MIT' },
                    ],
                },
            ];
        },
    });
    block<DocumentData>('footer').elem('brand')({
        tag: 'span',
        content: (node) => {
            if (!node.props) {
                return null;
            }
            const { brand, brandDark } = pageContext(node.props);

            return [
                brand ? { block: 'footer', elem: 'mark', mix: { block: 'brand', elem: 'mark', elemMods: { light: true } }, props: { src: `/${brand}` } } : null,
                brandDark ? { block: 'footer', elem: 'mark', mix: { block: 'brand', elem: 'mark', elemMods: { dark: true } }, props: { src: `/${brandDark}` } } : null,
                { block: 'footer', elem: 'name', content: 'nuckty' },
            ];
        },
    });
    block<DocumentData>('footer').elem('brand').mod('linked')({
        tag: 'a',
        attrs: (node, next) => ({
            ...next(),
            ...(node.props ? { href: pageContext(node.props).siteUrl, 'aria-label': pageContext(node.props).t['nuckty home'] } : {}),
        }),
    });
    block('footer').elem('mark')({
        tag: 'img',
        attrs: (node, next) => ({ ...next(), alt: '', width: '40', height: '28', ...attributes(node, ['src']) }),
    });
    block('footer').elem('name')({ tag: 'strong', bem: false });
    block('footer').elem('letter')({ tag: 'span', bem: false });
    block('footer').elem('break')({ tag: 'br', bem: false });
    block('footer').elem('made')({ tag: 'span' });
    block('footer').elem('caption')({ tag: 'p' });
    block('footer').elem('identity')({ tag: 'div' });
    block('footer').elem('license')({
        tag: 'a',
        attrs: (_node, next) => ({ ...next(), href: 'https://github.com/nuckty/nuckty/blob/main/LICENSE' }),
    });
    block('footer').elem('links')({
        tag: 'nav',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['aria-label']) }),
    });
}
