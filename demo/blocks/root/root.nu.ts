import { messages } from './root.i18n/index.js';
import { block, type BEMTree, type BemNode, type DocumentData, b, attributes } from '@nuckty/core';

function documentTree(
    node: Omit<BemNode, 'props'> & {
        props?: DocumentData;
    },
): BemNode {
    const data = node.props;
    if (!data) {
        throw new Error('Website root requires document data');
    }
    const locale = data.lang;
    const t = messages(locale);
    const demo = data.target?.data?.['kind'] === 'demo';
    const landing = data.page.layout === 'landing';
    const url = data.page.url;
    const title = `${data.page.name}${url === '/' ? '' : ' · nuckty'}`;
    const origin = demo ? t['https://demo.nuckty.com'] : `https://${data.target?.host ?? 'nuckty.ru'}`;
    const description =
        t[
            'A static site generator with Markdown, BEMJSON templates, extensions and build artifacts for nginx and Apache.'
        ];
    const brand = data.assets.images['brand/brand.svg'];
    const brandDark = data.assets.images['brand/brand-dark.svg'];
    const favicon = data.assets.images['brand/favicon.svg'];
    const logo = b(
        'brand',
        undefined,
        [
            ...(brand ? [b('brand', 'mark', null, { src: `/${brand}` }, { elemMods: { light: true } })] : []),
            ...(brandDark ? [b('brand', 'mark', null, { src: `/${brandDark}` }, { elemMods: { dark: true } })] : []),
            b('brand', 'name', demo ? 'nuckty demo' : 'nuckty'),
        ],
        {
            ...{ ...(url === '/' ? {} : { href: '/', 'aria-label': demo ? t['nuckty demo home'] : t['nuckty home'] }) },
            linked: url === '/' ? false : true,
        },
    );
    const siteUrl = String(data.target?.data?.['siteUrl'] ?? 'http://localhost:8091');
    const demoUrl = String(data.target?.data?.['demoUrl'] ?? 'http://localhost:8092');
    const navigation: BEMTree = demo
        ? [
              b('root', 'link', t['Features'], { href: '/', active: url === '/' }),
              b('root', 'link', 'Markdown', { href: '/markdown', active: url === '/markdown' }),
              b('root', 'link', t['Gallery and grid'], { href: '/media', active: url === '/media' }),
              b('root', 'link', t['Editor'], { href: '/playground', active: url === '/playground' }),
              b('root', 'link', t['Files'], { href: '/output', active: url === '/output' }),
              b('root', 'link', t['About nuckty ↗'], { href: siteUrl, active: false }),
          ]
        : [
              b('root', 'link', t['Use cases'], { href: '/use-cases', active: url === '/use-cases' }),
              b('root', 'link', t['Get started'], { href: '/how/start', active: url === '/how/start' }),
              b('root', 'link', t['Docs'], {
                  href: '/docs',
                  active: url !== '/' && url !== '/use-cases' && url !== '/how/start',
              }),
              b('root', 'link', t['Demo ↗'], { href: demoUrl, active: false }),
          ];
    const alternateUrl = `${data.target?.data?.['alternateOrigin'] ?? t['https://nuckty.ru']}${url}`;
    const header = b('header', undefined, [
        logo,
        b(
            'header',
            'nav',
            [
                navigation,
                ...(!demo ? [b('header', 'language', t['Русский'], { href: alternateUrl, active: false })] : []),
            ],
            { 'aria-label': t['Main navigation'] },
        ),
        b('header', 'tools', [
            ...(!demo
                ? [
                      b(
                          'icon-button',
                          undefined,
                          [
                              b(
                                  'control-icon',
                                  undefined,
                                  [
                                      b('root', 'arrow-path', null, {
                                          d: 'M17 10.5a6.5 6.5 0 1 1 -13 0a6.5 6.5 0 0 1 13 0Z',
                                      }),
                                      b('root', 'arrow-path', null, { d: 'm16 16 5 5' }),
                                  ],
                                  {},
                                  { mix: [{ block: 'search-trigger', elem: 'icon' }] },
                              ),
                              b('search-trigger', 'label', t['Search']),
                          ],
                          {
                              'aria-label': t['Search'],
                              'aria-haspopup': 'dialog',
                              hidden: true,
                          },
                          { mix: [{ block: 'search-trigger' }] },
                      ),
                  ]
                : []),
            b('language-link', undefined, t['RU'], { href: alternateUrl, active: false }),
            b(
                'icon-button',
                undefined,
                [
                    b(
                        'control-icon',
                        undefined,
                        b('root', 'arrow-path', null, {
                            d: 'M20.6 13.5A8.5 8.5 0 0 1 10.5 3.4a8.5 8.5 0 1 0 10.1 10.1Z',
                        }),
                        {},
                        { mix: [{ block: 'theme-toggle', elem: 'moon' }] },
                    ),
                    b(
                        'control-icon',
                        undefined,
                        [
                            b('root', 'arrow-path', null, { d: 'M16 12a4 4 0 1 1 -8 0a4 4 0 0 1 8 0Z' }),
                            b('root', 'arrow-path', null, {
                                d: 'M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
                            }),
                        ],
                        {},
                        { mix: [{ block: 'theme-toggle', elem: 'sun' }] },
                    ),
                ],
                { 'aria-label': t['Dark theme'], hidden: true },
                { mix: [{ block: 'theme-toggle' }] },
            ),
            b(
                'icon-button',
                undefined,
                b('menu-toggle', 'line', ''),
                {
                    'aria-label': t['Menu'],
                    'aria-controls': 'main-nav',
                    'aria-expanded': 'false',
                    hidden: true,
                },
                { mix: [{ block: 'menu-toggle' }] },
            ),
        ]),
    ]);
    const pages = Object.values(data.sitemap.pages).filter((page) => page.url !== '/' && page.url !== '/use-cases');
    const index = pages.findIndex((page) => page.url === url);
    const neighbors = [pages[index - 1], pages[index + 1]];
    const main: BemNode = landing
        ? b(
              'main',
              undefined,
              demo
                  ? data.content
                  : { block: 'home', props: { lang: data.lang, demoUrl, example: data.page['homeExample'] } },
              {},
              { mods: { landing: true } },
          )
        : b(
              'main',
              undefined,
              [
                  b('reading-nav', undefined, [
                      b(
                          'breadcrumbs',
                          undefined,
                          b(
                              'breadcrumbs',
                              'list',
                              [
                                  b('root', 'link', demo ? t['Demo'] : 'nuckty', { href: '/', active: false }),
                                  ...data.page.breadcrumbs
                                      .filter((route) => route !== url && Boolean(data.sitemap.pages[route]))
                                      .map((route) =>
                                          b('root', 'link', data.sitemap.pages[route]!.name, {
                                              href: route,
                                              active: false,
                                          }),
                                      ),
                              ].map((item, i) =>
                                  b('breadcrumbs', 'item', [...(i ? [b('breadcrumbs', 'separator', '/')] : []), item]),
                              ),
                          ),
                          { 'aria-label': t['Breadcrumb'] },
                      ),
                  ]),
                  b('article-column', undefined, [
                      b('article', undefined, data.content),
                      b(
                          'page-navigation',
                          undefined,
                          neighbors.map((page, i) =>
                              page
                                  ? b(
                                        'page-navigation',
                                        'link',
                                        b('page-navigation', 'name', [b('page-navigation', 'text', page.name)]),
                                        {
                                            href: page.url,
                                            rel: i === 0 ? 'prev' : 'next',
                                            'data-direction': i === 0 ? 'previous' : 'next',
                                            'aria-label': `${i === 0 ? t['Previous page'] : t['Next page']}: ${page.name}`,
                                        },
                                    )
                                  : null,
                          ),
                          { 'aria-label': t['Neighboring pages'] },
                      ),
                  ]),
              ],
              {},
              { mix: [{ block: 'docs-layout' }] },
          );
    const footer = b('footer', undefined, [
        b(
            'demo-wordmark',
            undefined,
            [...'nuckty'].map((letter) => b('root', 'text', letter)),
        ),
        b('footer', 'identity', [
            b(
                'footer',
                'brand',
                [
                    ...(brand
                        ? [
                              b(
                                  'footer',
                                  'mark',
                                  null,
                                  { src: `/${brand}` },
                                  { mix: [{ block: 'brand', elem: 'mark', elemMods: { light: true } }] },
                              ),
                          ]
                        : []),
                    ...(brandDark
                        ? [
                              b(
                                  'footer',
                                  'mark',
                                  null,
                                  { src: `/${brandDark}` },
                                  { mix: [{ block: 'brand', elem: 'mark', elemMods: { dark: true } }] },
                              ),
                          ]
                        : []),
                    b('root', 'name', 'nuckty'),
                ],
                {
                    ...{
                        ...(url === '/' ? {} : { href: demo ? siteUrl : '/', 'aria-label': t['nuckty home'] }),
                    },
                    linked: url === '/' ? false : true,
                },
            ),
            b('footer', 'caption', [b('footer', 'made', t['Made with nuckty.']), b('root', 'break'), t['Of course']]),
        ]),
        b(
            'footer',
            'links',
            [
                b('root', 'link', 'GitHub', { href: 'https://github.com/nuckty/nuckty', active: false }),
                b('source-link', undefined, t['Page source'], {
                    href: `https://github.com/nuckty/nuckty/blob/main/demo/content/${data.page.file}`,
                    'aria-label': t['Page source on GitHub'],
                }),
                b('footer', 'license', 'MIT'),
            ],
            { 'aria-label': t['More links'] },
        ),
    ]);
    const search = !demo
        ? b(
              'search-dialog',
              undefined,
              [
                  b('search-dialog', 'header', [
                      b('root', 'input-label', t['Search documentation'], {}, { mix: [{ block: 'visually-hidden' }] }),
                      b('search-dialog', 'input', null, {
                          placeholder: t['Search documentation…'],
                      }),
                      b(
                          'icon-button',
                          undefined,
                          'Esc',
                          { 'aria-label': t['Close search'] },
                          { mix: [{ block: 'search-close' }] },
                      ),
                  ]),
                  b('search-dialog', 'hint', t['Search a title, concept or command. Search runs locally.']),
                  b('search-results', undefined),
              ],
              { 'aria-label': t['Search documentation'] },
          )
        : null;
    const head: BEMTree = [
        b('root', 'meta', null, { charset: 'utf-8' }),
        b('root', 'title', title),
        b('root', 'meta', null, { name: 'viewport', content: 'width=device-width,initial-scale=1' }),
        b('root', 'meta', null, { name: 'description', content: description }),
        b('root', 'meta', null, { name: 'color-scheme', content: 'light dark' }),
        b('root', 'meta', null, { name: 'theme-color', content: '#ddd6c6' }),
        b('root', 'resource', null, { rel: 'canonical', href: `${origin}${url}` }),
        b('root', 'meta', null, { property: 'og:title', content: title }),
        b('root', 'meta', null, { property: 'og:description', content: description }),
        b('root', 'meta', null, { property: 'og:type', content: 'website' }),
        b('root', 'meta', null, { property: 'og:url', content: `${origin}${url}` }),
        ...(favicon ? [b('root', 'resource', null, { rel: 'icon', type: 'image/svg+xml', href: `/${favicon}` })] : []),
        ...Object.values(data.assets.css)
            .filter((asset) => asset.hash !== 'empty')
            .map((asset) => b('root', 'resource', null, { rel: 'stylesheet', href: asset.url })),
        ...[...data.alternates].map(([lang, alternate]) =>
            b('root', 'resource', null, { rel: 'alternate', hreflang: lang, href: alternate.url }),
        ),
    ];
    return b(
        'root',
        'html',
        [
            b('root', 'head', head),
            b('root', 'body', [
                b('skip-link', undefined, t['Skip to content'], { active: false }),
                header,
                main,
                footer,
                search,
                ...Object.values(data.assets.js)
                    .filter((asset) => asset.hash !== 'empty')
                    .map((asset) => b('root', 'script', '', { src: asset.url })),
            ]),
        ],
        { lang: data.lang ?? 'ru', 'data-site': demo ? 'demo' : 'website' },
    );
}

export default function templates(): void {
    block('root').elem('link')({
        tag: (node) => (node.props?.active ? 'span' : 'a'),
        attrs: (node, next) =>
            node.props?.active
                ? { ...next(), 'aria-current': 'page' }
                : { ...next(), href: String(node.props?.href ?? '') },
        bem: false,
    });
    block('root').elem('arrow-path')({
        tag: 'path',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['d']) }),
        bem: false,
    });
    block('root').elem('text')({
        tag: 'span',
        bem: false,
    });
    block('root').elem('name')({
        tag: 'strong',
        bem: false,
    });
    block('root').elem('break')({
        tag: 'br',
        bem: false,
    });
    block('root').elem('input-label')({
        tag: 'label',
        attrs: (node, next) => ({ for: 'search-input', ...next(), ...attributes(node, ['for']) }),
    });
    block('root').elem('meta')({
        tag: 'meta',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['charset', 'name', 'content', 'property']) }),
        bem: false,
    });
    block('root').elem('title')({
        tag: 'title',
        bem: false,
    });
    block('root').elem('resource')({
        tag: 'link',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['rel', 'href', 'type', 'hreflang']) }),
        bem: false,
    });
    block('root').elem('head')({
        tag: 'head',
        bem: false,
    });
    block('root').elem('script')({
        tag: 'script',
        attrs: (node, next) => ({ defer: true, ...next(), ...attributes(node, ['src', 'defer']) }),
        bem: false,
    });
    block('root').elem('body')({
        tag: 'body',
        bem: false,
    });
    block('root').elem('html')({
        tag: 'html',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['lang', 'data-site']) }),
    });
    block('root')({
        tag: 'div',
    });
    block<import('@nuckty/core').DocumentData>('root')
        .when((node) => Boolean(node.props))
        .wrap(documentTree);
}
