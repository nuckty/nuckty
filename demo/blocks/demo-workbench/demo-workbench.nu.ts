import { block } from '@nuckty/core';
import { attributes } from '../bem/bem.js';

export default function templates(): void {
    block('demo-workbench').elem('note')({
        tag: 'p',
    });
    block('demo-workbench').when((node) => !node.elem)({
        tag: 'section',
        attrs: (node, next) => ({ id: 'playground', ...next(), ...attributes(node, ['id']) }),
    });
}
