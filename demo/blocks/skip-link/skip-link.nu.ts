import { block } from '@nuckty/core';

export default function templates(): void {
    block('skip-link')({
        tag: (node) => (node.props?.active ? 'span' : 'a'),
        attrs: (node, next) => ({ ...next(), href: '#main' }),
    });
}
