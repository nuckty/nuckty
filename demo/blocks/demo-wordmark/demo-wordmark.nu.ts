import { block, attributes } from '@nuckty/core';

export default function templates(): void {
    block('demo-wordmark')({
        tag: 'div',
        attrs: (node, next) => ({ 'aria-hidden': 'true', ...next(), ...attributes(node, ['aria-hidden']) }),
    });
}
