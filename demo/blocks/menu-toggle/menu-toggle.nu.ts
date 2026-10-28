import { block, attributes } from '@nuckty/core';

export default function templates(): void {
    block('menu-toggle').elem('line')({
        tag: 'span',
        attrs: (node, next) => ({ 'aria-hidden': 'true', ...next(), ...attributes(node, ['aria-hidden']) }),
    });
}
