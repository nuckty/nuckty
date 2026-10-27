/**
 * lightbox — the full-size view helper of the gallery. The gallery tree ships
 * a `lightbox` dialog with a close control as its last child; the gallery script fills it
 * with the clicked image and toggles visibility.
 */
import { block } from '@nuckty/core';

export default function templates(): void {
    block('lightbox')({ tag: 'dialog' });
    block('lightbox').elem('image')({ tag: 'img' });
    block('lightbox').elem('close')({ tag: 'button' });
}
