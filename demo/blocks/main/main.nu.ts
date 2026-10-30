import { block, type BEMTree, type DocumentData } from '@nuckty/core';

export default function templates(): void {
    block('main')({
        tag: 'main',
        attrs: (_node, next) => ({ ...next(), id: 'main' }),
    });
    block<DocumentData>('main').mod('layout', 'docs')({
        content: (node) => {
            const content: BEMTree = node.content ?? null;

            return [
                { block: 'reading-nav', content: { block: 'breadcrumbs', props: node.props ?? {} } },
                {
                    block: 'article-column',
                    content: [
                        { block: 'article', content },
                        { block: 'page-navigation', props: node.props ?? {} },
                    ],
                },
            ];
        },
    });
}
