import { block, attributes } from '@nuckty/core';

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
    block('brand')({
        tag: (node) => (node.props?.linked ? 'a' : 'span'),
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['href', 'aria-label']) }),
    });
}
