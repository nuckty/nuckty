import { block } from '@nuckty/core';
import { attributes } from '../bem/bem.js';

export default function templates(): void {
    block('demo-note').elem('link')({
        tag: 'a',
        attrs: (node, next) => ({ href: '/output', ...next(), ...attributes(node, ['href']) }),
    });
    block('demo-note')({
        tag: 'section',
    });
}
