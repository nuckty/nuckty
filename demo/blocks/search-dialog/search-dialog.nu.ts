import { block } from '@nuckty/core';
import { attributes } from '../bem/bem.js';

export default function templates(): void {
    block('search-dialog').elem('input')({
        tag: 'input',
        attrs: (node, next) => ({
            id: 'search-input',
            type: 'search',
            autocomplete: 'off',
            ...next(),
            ...attributes(node, ['id', 'type', 'placeholder', 'autocomplete']),
        }),
    });
    block('search-dialog').elem('header')({
        tag: 'div',
    });
    block('search-dialog').elem('hint')({
        tag: 'p',
    });
    block('search-dialog').when((node) => !node.elem)({
        tag: 'dialog',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['aria-label']) }),
    });
}
