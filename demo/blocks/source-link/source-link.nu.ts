import { block } from '@nuckty/core';
import { attributes } from '../bem/bem.js';

export default function templates(): void {
    block('source-link').when((node) => !node.elem)({
        tag: 'a',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['href', 'aria-label']) }),
    });
}
