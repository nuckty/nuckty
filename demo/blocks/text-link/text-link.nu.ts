import { block, attributes } from '@nuckty/core';

export default function templates(): void {
    block('text-link')({
        tag: 'a',
        attrs: (node, next) => ({ href: '/media', ...next(), ...attributes(node, ['href']) }),
    });
}
