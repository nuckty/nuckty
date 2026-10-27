import { block } from '@nuckty/core';
import { attributes } from '../bem/bem.js';

export default function templates(): void {
    block('header').elem('language')({
        tag: (node) => (node.props?.active ? 'span' : 'a'),
        attrs: (node, next) =>
            node.props?.active
                ? { ...next(), 'aria-current': 'page' }
                : { ...next(), href: String(node.props?.href ?? '') },
    });
    block('header').elem('nav')({
        tag: 'nav',
        attrs: (node, next) => ({ id: 'main-nav', ...next(), ...attributes(node, ['id', 'aria-label']) }),
    });
    block('header').elem('tools')({
        tag: 'div',
    });
    block('header').when((node) => !node.elem)({
        tag: 'header',
    });
}
