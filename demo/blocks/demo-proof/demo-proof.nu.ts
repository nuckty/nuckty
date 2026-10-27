import { block } from '@nuckty/core';
import { attributes } from '../bem/bem.js';

export default function templates(): void {
    block('demo-proof').elem('sample')({
        tag: 'div',
    });
    block('demo-proof').elem('grid')({
        tag: 'div',
    });
    block('demo-proof').when((node) => !node.elem)({
        tag: 'section',
        attrs: (node, next) => ({ id: 'examples', ...next(), ...attributes(node, ['id']) }),
    });
}
