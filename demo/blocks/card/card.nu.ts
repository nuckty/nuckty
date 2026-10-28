import { block } from '@nuckty/core';

export default function templates(): void {
    block('card')({ tag: 'article' });
    block('card').elem('title')({ tag: 'h2' });
    block('card').elem('description')({ tag: 'p' });
}
