import { block } from '@nuckty/core';

export default function templates(): void {
    block('search-trigger').elem('label')({
        tag: 'span',
    });
}
