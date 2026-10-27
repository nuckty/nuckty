import { block } from '@nuckty/core';
import { attributes } from '../bem/bem.js';

export default function templates(): void {
    block('brand').elem('mark')({
        tag: 'img',
        attrs: (node, next) => ({
            alt: '',
            width: '62',
            height: '44',
            ...next(),
            ...attributes(node, ['src', 'alt', 'width', 'height']),
        }),
    });
    block('brand').elem('name')({
        tag: 'span',
    });
    block('brand').when((node) => !node.elem)({
        tag: (node) => (node.props?.linked ? 'a' : 'span'),
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['href', 'aria-label']) }),
    });
}
