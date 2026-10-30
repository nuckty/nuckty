import { block, attributes, type DocumentData } from '@nuckty/core';
import { pageContext } from '../root/root.page.js';

export default function templates(): void {
    block<DocumentData>('brand')({
        tag: 'span',
        content: (node) => {
            if (!node.props) {
                return null;
            }
            const { brand, brandDark } = pageContext(node.props);

            return [
                brand ? { block: 'brand', elem: 'mark', elemMods: { light: true }, props: { src: `/${brand}` } } : null,
                brandDark ? { block: 'brand', elem: 'mark', elemMods: { dark: true }, props: { src: `/${brandDark}` } } : null,
                { block: 'brand', elem: 'name', content: 'nuckty demo' },
            ];
        },
    });
    block<DocumentData>('brand').mod('linked')({
        tag: 'a',
        attrs: (node, next) => ({ ...next(), href: '/', ...(node.props ? { 'aria-label': pageContext(node.props).t['nuckty demo home'] } : {}) }),
    });
    block('brand').elem('mark')({
        tag: 'img',
        attrs: (node, next) => ({ ...next(), alt: '', width: '62', height: '44', ...attributes(node, ['src']) }),
    });
    block('brand').elem('name')({ tag: 'span' });
}
