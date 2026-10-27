import { block } from '@nuckty/core';
import { attributes } from '../bem/bem.js';

export default function templates(): void {
    block('main')({
        tag: 'main',
        attrs: (node, next) => ({ id: 'main', ...next(), ...attributes(node, ['id']) }),
    });
}
