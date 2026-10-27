import { block } from '@nuckty/core';

export default function templates(): void {
    block('article').when((node) => !node.elem && !node.tag)({
        tag: 'article',
    });
}
