import { block, attributes } from '@nuckty/core';

export default function templates(): void {
    block('source-link')({
        tag: 'a',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['href', 'aria-label']) }),
    });
}
