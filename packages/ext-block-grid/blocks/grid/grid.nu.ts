/**
 * grid — multi-column layout block. The `:::grid` construct handler builds the
 * tree (items as cells); these templates supply the default tags so a
 * hand-built tree renders the same way.
 */
import { block } from '@nuckty/core';

export default function templates(): void {
    block('grid')({ tag: 'div' });
    block('grid').elem('item')({ tag: 'div' });
}
