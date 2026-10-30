import { block, attributes } from '@nuckty/core';

export default function templates(): void {
    block('language-link')({
        tag: 'a',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['href']) }),
    });
}
