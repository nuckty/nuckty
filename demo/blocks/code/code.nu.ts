import { block, attributes } from '@nuckty/core';

export default function templates(): void {
    block('code')({
        tag: 'pre',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['id', 'tabindex']) }),
    });
    block('code').elem('content')({ tag: 'code', bem: false });
}
