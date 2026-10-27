import { block } from '@nuckty/core';

export default function templates(): void {
    block('reading-nav').when((node) => !node.elem)({
        tag: 'div',
    });
}
