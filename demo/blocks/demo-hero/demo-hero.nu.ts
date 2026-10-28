import { block, attributes } from '@nuckty/core';

export default function templates(): void {
    block('demo-hero').elem('meta')({
        tag: 'div',
    });
    block('demo-hero').elem('name')({
        tag: 'div',
    });
    block('demo-hero').elem('source')({
        tag: 'figure',
        attrs: (node, next) => ({ id: 'demo-card-source', ...next(), ...attributes(node, ['id']) }),
    });
    block('demo-hero').elem('glyph')({
        tag: 'span',
        attrs: (node, next) => ({ 'aria-hidden': 'true', ...next(), ...attributes(node, ['aria-hidden']) }),
    });
    block('demo-hero').elem('sample')({
        tag: 'div',
    });
    block('demo-hero').elem('output')({
        tag: 'div',
        attrs: (node, next) => ({ id: 'demo-card-result', ...next(), ...attributes(node, ['id']) }),
    });
    block('demo-hero').elem('statement')({
        tag: 'div',
    });
    block('demo-hero').elem('start')({
        tag: 'a',
        attrs: (node, next) => ({ href: '#playground', ...next(), ...attributes(node, ['href']) }),
    });
    block('demo-hero')({
        tag: 'section',
    });
}
