import { messages } from './lightbox.i18n/index.js';
import { block } from '@nuckty/core';

export default function templates(): void {
    block<{ lang?: string }>('lightbox')({
        tag: 'dialog',
        attrs: (node, next) => ({ ...next(), 'aria-label': messages(node.props?.lang)['Image viewer'] }),
    });
    block<{ lang?: string }>('lightbox').elem('image')({ tag: 'img' });
    block<{ lang?: string }>('lightbox').elem('close')({
        tag: 'button',
        attrs: (node, next) => ({ ...next(), 'aria-label': messages(node.props?.lang)['Close image'] }),
    });
}
