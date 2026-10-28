import { block, attributes } from '@nuckty/core';

export default function templates(): void {
    block('demo-workbench').elem('note')({
        tag: 'p',
    });
    block('demo-workbench')({
        tag: 'section',
        attrs: (node, next) => ({ id: 'playground', ...next(), ...attributes(node, ['id']) }),
    });
}
