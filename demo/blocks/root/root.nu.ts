import { block, attributes, type BEMTree, type DocumentData } from '@nuckty/core';
import { pageContext } from './root.page.js';

function head(data: DocumentData): BEMTree {
    const { t, url, home, origin, favicon } = pageContext(data);
    const title = `${data.page.name}${home ? '' : ' · nuckty'}`;
    const description = t['A static site generator with Markdown, BEMJSON templates, extensions and build artifacts for nginx and Apache.'];
    const meta = (props: Record<string, string>): BEMTree => ({ block: 'root', elem: 'meta', props });
    const resource = (props: Record<string, string>): BEMTree => ({ block: 'root', elem: 'resource', props });

    return [
        meta({ charset: 'utf-8' }),
        { block: 'root', elem: 'title', content: title },
        meta({ name: 'viewport', content: 'width=device-width,initial-scale=1' }),
        meta({ name: 'description', content: description }),
        meta({ name: 'color-scheme', content: 'light dark' }),
        meta({ name: 'theme-color', content: '#ddd6c6' }),
        resource({ rel: 'canonical', href: `${origin}${url}` }),
        meta({ property: 'og:title', content: title }),
        meta({ property: 'og:description', content: description }),
        meta({ property: 'og:type', content: 'website' }),
        meta({ property: 'og:url', content: `${origin}${url}` }),
        favicon ? resource({ rel: 'icon', type: 'image/svg+xml', href: `/${favicon}` }) : null,
        Object.values(data.assets.css).map((asset) => resource({ rel: 'stylesheet', href: asset.url })),
        [...data.alternates].map(([lang, alternate]) => resource({ rel: 'alternate', hreflang: lang, href: alternate.url })),
    ];
}

export default function templates(): void {
    block<DocumentData>('root')({
        tag: 'html',
        bem: false,
        attrs: (node, next) => ({ ...next(), lang: node.props?.lang ?? 'ru' }),
        content: (node) => [
            { block: 'root', elem: 'head', props: node.props ?? {} },
            { block: 'root', elem: 'body', props: node.props ?? {}, content: node.content ?? null },
        ],
    });
    block<DocumentData>('root').elem('head')({
        tag: 'head',
        bem: false,
        content: (node) => (node.props ? head(node.props) : null),
    });
    block<DocumentData>('root').elem('body')({
        tag: 'body',
        bem: false,
        content: (node) => {
            const data = node.props;

            if (!data) {
                return null;
            }

            return [
                { block: 'skip-link', content: pageContext(data).t['Skip to content'] },
                { block: 'header', props: data },
                { block: 'main', mods: { layout: data.page.layout === 'landing' ? 'landing' : 'docs' }, props: data, content: node.content ?? null },
                { block: 'footer', props: data },
                Object.values(data.assets.js).map((asset) => ({ block: 'root', elem: 'script', props: { src: asset.url } })),
            ];
        },
    });
    block('root').elem('meta')({
        tag: 'meta',
        bem: false,
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['charset', 'name', 'content', 'property']) }),
    });
    block('root').elem('title')({ tag: 'title', bem: false });
    block('root').elem('resource')({
        tag: 'link',
        bem: false,
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['rel', 'href', 'type', 'hreflang']) }),
    });
    block('root').elem('script')({
        tag: 'script',
        bem: false,
        attrs: (node, next) => ({ ...next(), defer: true, ...attributes(node, ['src']) }),
        content: '',
    });
}
