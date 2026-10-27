import { block } from '@nuckty/core';
import { attributes } from '../bem/bem.js';

export default function templates(): void {
    block('text-link').when((node) => !node.elem)({
        tag: 'a',
        attrs: (node, next) => ({ href: '/media', ...next(), ...attributes(node, ['href']) }),
    });
}
