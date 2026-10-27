import { messages } from './example.i18n/index.js';
import { highlightCode } from '../../ext/highlight.js';
import { b, attributes } from '../bem/bem.js';
import { block, type BEMTree, type BemNode } from '@nuckty/core';

function exampleTree(
    node: Omit<BemNode, 'props'> & {
        props?: {
            sample: string;
            source: string;
            lang?: string;
        };
    },
): BemNode {
    const locale = node.props?.lang;
    const t = messages(locale);
    const id = `example-${node.props?.sample}`;
    return b(
        'example',
        undefined,
        [
            b(
                'example',
                'tabs',
                [
                    b('example', 'tab', t['Result'], {
                        id: `${id}-result-tab`,
                        'aria-selected': 'true',
                        'aria-controls': `${id}-result`,
                        'data-view': 'result',
                    }),
                    b('example', 'tab', t['Markdown source'], {
                        id: `${id}-source-tab`,
                        'aria-selected': 'false',
                        'aria-controls': `${id}-source`,
                        tabindex: '-1',
                        'data-view': 'source',
                    }),
                    b('example', 'label', `examples/${node.props?.sample}${t['.en']}.md`),
                ],
                { 'aria-label': t['Example view'] },
            ),
            b('example', 'result', node.content, {
                id: `${id}-result`,

                'aria-labelledby': `${id}-result-tab`,
            }),
            b(
                'example',
                'source',
                b(
                    'example',
                    'snippet',
                    b('example', 'code', { raw: highlightCode(node.props?.source ?? '', 'markdown') }),
                ),
                {
                    id: `${id}-source`,

                    'aria-labelledby': `${id}-source-tab`,
                },
            ),
        ],
        { 'data-example': id, 'aria-label': t['Example source and result'] },
    );
}

export default function templates(): void {
    block('example').elem('tab')({
        tag: 'button',
        attrs: (node, next) => ({
            type: 'button',
            role: 'tab',
            ...next(),
            ...attributes(node, ['type', 'role', 'id', 'aria-selected', 'aria-controls', 'data-view', 'tabindex']),
        }),
    });
    block('example').elem('label')({
        tag: 'span',
    });
    block('example').elem('tabs')({
        tag: 'div',
        attrs: (node, next) => ({
            role: 'tablist',
            hidden: true,
            ...next(),
            ...attributes(node, ['role', 'aria-label', 'hidden']),
        }),
    });
    block('example').elem('result')({
        tag: 'div',
        attrs: (node, next) => ({
            role: 'tabpanel',
            'data-panel': 'result',
            tabindex: '0',
            ...next(),
            ...attributes(node, ['id', 'role', 'aria-labelledby', 'data-panel', 'tabindex']),
        }),
    });
    block('example').elem('code')({
        tag: 'code',
    });
    block('example').elem('snippet')({
        tag: 'pre',
    });
    block('example').elem('source')({
        tag: 'div',
        attrs: (node, next) => ({
            role: 'tabpanel',
            'data-panel': 'source',
            hidden: true,
            tabindex: '0',
            ...next(),
            ...attributes(node, ['id', 'role', 'aria-labelledby', 'data-panel', 'hidden', 'tabindex']),
        }),
    });
    block('example').when((node) => !node.elem)({
        tag: 'section',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['data-example', 'aria-label']) }),
    });
    block<{ sample: string; source: string; lang?: string }>('example')
        .when((node) => !node.elem && Boolean(node.props))
        .replace(exampleTree);
}
