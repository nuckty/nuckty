import { block } from '@nuckty/core';
import { attributes } from '../bem/bem.js';

export default function templates(): void {
    block('page-navigation').elem('text')({
        tag: 'span',
    });
    block('page-navigation').elem('name')({
        tag: 'span',
    });
    block('page-navigation').elem('link')({
        tag: 'a',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['href', 'rel', 'data-direction', 'aria-label']) }),
    });
    block('page-navigation')({
        tag: 'nav',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['aria-label']) }),
    });
}
