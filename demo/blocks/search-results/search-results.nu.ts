import { block } from '@nuckty/core';
import { attributes } from '../bem/bem.js';

export default function templates(): void {
    block('search-results').when((node) => !node.elem)({
        tag: 'div',
        attrs: (node, next) => ({ 'aria-live': 'polite', ...next(), ...attributes(node, ['aria-live']) }),
    });
}
