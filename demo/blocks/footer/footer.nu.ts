import { block } from '@nuckty/core';
import { attributes } from '../bem/bem.js';

export default function templates(): void {
    block('footer').elem('mark')({
        tag: 'img',
        attrs: (node, next) => ({
            alt: '',
            width: '40',
            height: '28',
            ...next(),
            ...attributes(node, ['src', 'alt', 'width', 'height']),
        }),
    });
    block('footer').elem('brand')({
        tag: (node) => (node.props?.linked ? 'a' : 'span'),
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['href', 'aria-label']) }),
    });
    block('footer').elem('made')({
        tag: 'span',
    });
    block('footer').elem('caption')({
        tag: 'p',
    });
    block('footer').elem('identity')({
        tag: 'div',
    });
    block('footer').elem('license')({
        tag: 'a',
        attrs: (node, next) => ({
            href: 'https://github.com/nuckty/nuckty/blob/main/LICENSE',
            ...next(),
            ...attributes(node, ['href']),
        }),
    });
    block('footer').elem('links')({
        tag: 'nav',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['aria-label']) }),
    });
    block('footer').when((node) => !node.elem)({
        tag: 'footer',
    });
}
