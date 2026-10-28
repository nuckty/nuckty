import { block, attributes } from '@nuckty/core';

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
    block('search-dialog')({
        tag: 'dialog',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['aria-label']) }),
    });
}
