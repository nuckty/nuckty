import { block } from '@nuckty/core';

export default function templates(): void {
    block('language-link')({
        tag: (node) => (node.props?.active ? 'span' : 'a'),
        attrs: (node, next) =>
            node.props?.active
                ? { ...next(), 'aria-current': 'page' }
                : { ...next(), href: String(node.props?.href ?? '') },
    });
}
