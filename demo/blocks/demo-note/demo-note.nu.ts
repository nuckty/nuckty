import { block, attributes } from '@nuckty/core';

export default function templates(): void {
    block('demo-note').elem('link')({
        tag: 'a',
        attrs: (node, next) => ({ href: '/output', ...next(), ...attributes(node, ['href']) }),
    });
    block('demo-note')({
        tag: 'section',
    });
}
