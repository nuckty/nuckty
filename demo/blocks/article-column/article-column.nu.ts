import { block } from '@nuckty/core';

export default function templates(): void {
    block('article-column').when((node) => !node.elem)({
        tag: 'div',
    });
}
