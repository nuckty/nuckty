import { block } from '@nuckty/core';
import { attributes } from '../bem/bem.js';

export default function templates(): void {
    block('breadcrumbs').elem('separator')({
        tag: 'span',
        attrs: (node, next) => ({ 'aria-hidden': 'true', ...next(), ...attributes(node, ['aria-hidden']) }),
    });
    block('breadcrumbs').elem('item')({
        tag: 'li',
    });
    block('breadcrumbs').elem('list')({
        tag: 'ol',
    });
    block('breadcrumbs')({
        tag: 'nav',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['aria-label']) }),
    });
}
