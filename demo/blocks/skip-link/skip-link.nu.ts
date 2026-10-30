import { block } from '@nuckty/core';

export default function templates(): void {
    block('skip-link')({
        tag: 'a',
        attrs: (_node, next) => ({ ...next(), href: '#main' }),
    });
}
