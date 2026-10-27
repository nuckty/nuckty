import { block } from '@nuckty/core';
import { attributes } from '../bem/bem.js';

export default function templates(): void {
    block('demo-arrow').when((node) => !node.elem)({
        tag: 'svg',
        attrs: (node, next) => ({
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': '1.3',
            'aria-hidden': 'true',
            ...next(),
            ...attributes(node, ['viewBox', 'fill', 'stroke', 'stroke-width', 'aria-hidden']),
        }),
    });
}
