import { block, attributes } from '@nuckty/core';

export default function templates(): void {
    block('main')({
        tag: 'main',
        attrs: (node, next) => ({ id: 'main', ...next(), ...attributes(node, ['id']) }),
    });
}
