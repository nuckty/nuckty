import { block } from '@nuckty/core';
import { attributes } from '../bem/bem.js';

export default function templates(): void {
    block('demo-wordmark')({
        tag: 'div',
        attrs: (node, next) => ({ 'aria-hidden': 'true', ...next(), ...attributes(node, ['aria-hidden']) }),
    });
}
