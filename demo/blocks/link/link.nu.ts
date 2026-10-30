import { block, attributes } from '@nuckty/core';

export default function templates(): void {
    block('link')({
        tag: 'a',
        bem: false,
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['href']) }),
    });
    block('link').mod('current')({
        tag: 'span',
        attrs: { 'aria-current': 'page' },
    });
}
