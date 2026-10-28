import { block } from '@nuckty/core';
import { attributes } from '../bem/bem.js';

export default function templates(): void {
    block('demo-nav').elem('link')({
        tag: 'a',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['href']) }),
    });
    block('demo-nav')({
        tag: 'nav',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['aria-label']) }),
    });
}
