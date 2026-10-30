/**
 * gallery — image grid block. The `:::gallery` handler supplies each item's
 * URL, alt text and lazy-loading flag as props; these templates build the
 * link and the image from them.
 */
import { block, attributes } from '@nuckty/core';

export default function templates(): void {
    block('gallery')({ tag: 'div' });
    block('gallery').elem('item')({
        tag: 'a',
        attrs: (node, next) => ({ ...next(), ...(typeof node.props?.['src'] === 'string' ? { href: node.props['src'] } : {}) }),
        content: (node) => ({ block: 'gallery', elem: 'image', props: node.props ?? {} }),
    });
    block('gallery').elem('image')({
        tag: 'img',
        attrs: (node, next) => ({
            ...next(),
            ...attributes(node, ['src', 'alt']),
            ...(node.props?.['lazy'] === true ? { loading: 'lazy' } : {}),
        }),
    });
}
