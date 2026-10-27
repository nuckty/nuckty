import { block } from '@nuckty/core';
import { attributes } from '../bem/bem.js';

export default function templates(): void {
    block('icon-button').when((node) => !node.elem)({
        tag: 'button',
        attrs: (node, next) => ({
            type: 'button',
            ...next(),
            ...attributes(node, ['type', 'aria-label', 'aria-haspopup', 'hidden', 'aria-controls', 'aria-expanded']),
        }),
    });
}
