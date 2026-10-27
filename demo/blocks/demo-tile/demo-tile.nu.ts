import { block } from '@nuckty/core';

export default function templates(): void {
    block('demo-tile').when((node) => !node.elem)({
        tag: 'div',
    });
}
