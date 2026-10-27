import { block } from '@nuckty/core';
import { attributes } from '../bem/bem.js';

export default function templates(): void {
    block('code').when((node) => !node.elem)({
        tag: 'pre',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['id', 'tabindex']) }),
    });
    block('code').elem('content')({ tag: 'code', bem: false });
}
