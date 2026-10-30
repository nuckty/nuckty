import { block, type DocumentData } from '@nuckty/core';
import { pageContext } from '../root/root.page.js';

export default function templates(): void {
    block<DocumentData>('breadcrumbs')({
        tag: 'nav',
        attrs: (node, next) => ({ ...next(), ...(node.props ? { 'aria-label': pageContext(node.props).t['Breadcrumb'] } : {}) }),
        content: (node) => {
            const data = node.props;

            if (!data) {
                return null;
            }
            const { t, url } = pageContext(data);
            const links = [
                { href: '/', name: t['Demo'] },
                ...data.page.breadcrumbs
                    .filter((route) => route !== url && data.sitemap.pages[route] !== undefined)
                    .map((route) => ({ href: route, name: data.sitemap.pages[route]!.name })),
            ];

            return {
                block: 'breadcrumbs',
                elem: 'list',
                content: links.map((link, index) => ({
                    block: 'breadcrumbs',
                    elem: 'item',
                    content: [
                        index > 0 ? { block: 'breadcrumbs', elem: 'separator', content: '/' } : null,
                        { block: 'link', props: { href: link.href }, content: link.name },
                    ],
                })),
            };
        },
    });
    block('breadcrumbs').elem('list')({ tag: 'ol' });
    block('breadcrumbs').elem('item')({ tag: 'li' });
    block('breadcrumbs').elem('separator')({
        tag: 'span',
        attrs: { 'aria-hidden': 'true' },
    });
}
