import { block, attributes } from '@nuckty/core';

export default function templates(): void {
    block('demo-proof').elem('sample')({
        tag: 'div',
    });
    block('demo-proof').elem('grid')({
        tag: 'div',
    });
    block('demo-proof')({
        tag: 'section',
        attrs: (node, next) => ({ id: 'examples', ...next(), ...attributes(node, ['id']) }),
    });
}
