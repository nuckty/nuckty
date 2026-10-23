/**
 * gallery — image grid block. The `:::gallery` construct handler builds the
 * tree (items, images, trailing lightbox); these templates supply the default
 * tags so a hand-built tree renders the same way.
 */
import { block } from 'nuckty';

export default function templates(): void {
    block('gallery')({ tag: 'div' });
    block('gallery').elem('item')({ tag: 'a' });
    block('gallery').elem('image')({ tag: 'img' });
}
