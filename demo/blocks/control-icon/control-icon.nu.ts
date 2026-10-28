import { block } from '@nuckty/core';

export default function templates(): void {
    block('control-icon')({
        tag: 'svg',
        attrs: {
            viewBox: '0 0 24 24',
            width: '20',
            height: '20',
            fill: 'none',
            stroke: 'currentColor',
            'stroke-width': '1.6',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            'aria-hidden': 'true',
            focusable: 'false',
        },
    });
}
