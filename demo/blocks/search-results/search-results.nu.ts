import { block, attributes } from '@nuckty/core';

export default function templates(): void {
    block('search-results')({
        tag: 'div',
        attrs: (node, next) => ({ 'aria-live': 'polite', ...next(), ...attributes(node, ['aria-live']) }),
    });
}
