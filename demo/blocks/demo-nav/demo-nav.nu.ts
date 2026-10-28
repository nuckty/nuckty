import { block, attributes } from '@nuckty/core';

export default function templates(): void {
    block('demo-nav').elem('link')({
        tag: 'a',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['href']) }),
    });
    block('demo-nav')({
        tag: 'nav',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['aria-label']) }),
    });
}
