import { block, attributes, type DocumentData } from '@nuckty/core';
import { pageContext } from '../root/root.page.js';

export default function templates(): void {
    block<DocumentData>('page-navigation')({
        tag: 'nav',
        attrs: (node, next) => ({ ...next(), ...(node.props ? { 'aria-label': pageContext(node.props).t['Neighboring pages'] } : {}) }),
        content: (node) => {
            const data = node.props;

            if (!data) {
                return null;
            }
            const { t, url } = pageContext(data);
            const pages = Object.values(data.sitemap.pages).filter((page) => page.url !== '/');
            const index = pages.findIndex((page) => page.url === url);
            const neighbors = [
                { page: pages[index - 1], rel: 'prev', direction: 'previous', label: t['Previous page'] },
                { page: pages[index + 1], rel: 'next', direction: 'next', label: t['Next page'] },
            ];

            return neighbors.map(({ page, rel, direction, label }) => page
                ? {
                    block: 'page-navigation',
                    elem: 'link',
                    props: { href: page.url, rel, 'data-direction': direction, 'aria-label': `${label}: ${page.name}` },
                    content: { block: 'page-navigation', elem: 'name', content: { block: 'page-navigation', elem: 'text', content: page.name } },
                }
                : null);
        },
    });
    block('page-navigation').elem('link')({
        tag: 'a',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['href', 'rel', 'data-direction', 'aria-label']) }),
    });
    block('page-navigation').elem('name')({ tag: 'span' });
    block('page-navigation').elem('text')({ tag: 'span' });
}
