import { block } from '@nuckty/core';

export default function templates(): void {
    block('demo-section-heading').when((node) => !node.elem)({
        tag: 'div',
    });
}
