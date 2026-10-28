import { block, attributes } from '@nuckty/core';

export default function templates(): void {
    block('icon-button')({
        tag: 'button',
        attrs: (node, next) => ({
            type: 'button',
            ...next(),
            ...attributes(node, ['type', 'aria-label', 'aria-haspopup', 'hidden', 'aria-controls', 'aria-expanded']),
        }),
    });
}
