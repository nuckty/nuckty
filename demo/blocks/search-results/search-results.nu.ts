import { block } from '@nuckty/core';
import { attributes } from '../bem/bem.js';

export default function templates(): void {
    block('search-results')({
        tag: 'div',
        attrs: (node, next) => ({ 'aria-live': 'polite', ...next(), ...attributes(node, ['aria-live']) }),
    });
}
