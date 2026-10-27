/**
 * root — the page wrapper block: wraps page content into a full HTML document.
 *
 * The extension's document handler maps engine-provided `DocumentData` to
 * `{ block: 'root', props, content }`; this template shapes the document.
 * The core does not know the block name or its implementation.
 *
 * `wrap` is a control mode: the template fires once, so the `head`/`body`
 * nodes it returns do not re-trigger it (no recursion). The `page*` namespace
 * stays reserved for the site; this block owns only `root`.
 */
import { block } from '@nuckty/core';
import type { BemNode, DocumentData } from '@nuckty/core';

export default function templates(): void {
    block<DocumentData>('root').when((n) => Boolean(n.props)).wrap((n) => {
        if (!n.props) {
            throw new Error('root template requires document data');
        }

        const data = n.props;
        const lang = data.lang ?? 'en';

        const head: BemNode[] = [
            { tag: 'meta', attrs: { charset: 'utf-8' } },
            { tag: 'title', content: data.page.title },
            { tag: 'meta', attrs: { name: 'viewport', content: 'width=device-width,initial-scale=1' } },
        ];
        const cssUrls = new Set(Object.values(data.assets.css).map((asset) => asset.url).filter(Boolean));
        const jsUrls = new Set(Object.values(data.assets.js).map((asset) => asset.url).filter(Boolean));
        for (const url of cssUrls) {
            head.push({ tag: 'link', attrs: { rel: 'stylesheet', href: url } });
        }
        const scripts: BemNode[] = [...jsUrls].map((url) => ({
            tag: 'script', attrs: { src: url, defer: true }, content: '',
        }));
        for (const [altLang, alternate] of data.alternates) {
            head.push({ tag: 'link', attrs: { rel: 'alternate', hreflang: altLang, href: alternate.url } });
        }

        return {
            tag: 'html',
            attrs: { lang },
            content: [
                { tag: 'head', content: head },
                { tag: 'body', content: [n.content, ...scripts] },
            ],
        };
    });
}
