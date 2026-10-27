import { block, type BEMTree, type BemNode, type DocumentData } from '@nuckty/core';

const element = (tag: string, cls: string, content: BEMTree, attrs: BemNode['attrs'] = {}): BemNode => ({ tag, cls, content, attrs, bem: false });
const link = (href: string, text: string, cls = '', active = false): BemNode => element(active ? 'span' : 'a', cls, text, { ...(active ? { 'aria-current': 'page' } : { href }) });
const icon = (cls: string, content: BEMTree): BemNode => element('svg', cls, content, { viewBox: '0 0 24 24', width: '20', height: '20', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.6', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false' });

export default function templates(): void {
    block<DocumentData>('root').when((node) => Boolean(node.props)).wrap((node) => {
        const data = node.props;

        if (!data) {
            throw new Error('Website root requires document data');
        }

        const ru = data.lang === 'ru';
        const demo = data.target?.data?.['kind'] === 'demo';
        const landing = data.page.layout === 'landing';
        const url = data.page.url;
        const title = `${data.page.name}${url === '/' ? '' : ' · nuckty'}`;
        const origin = demo ? (ru ? 'https://demo.nuckty.ru' : 'https://demo.nuckty.com') : `https://${data.target?.host ?? 'nuckty.ru'}`;
        const description = ru ? 'Генератор статических сайтов: Markdown, шаблоны BEMJSON, расширения и готовый артефакт для nginx и Apache.' : 'A static site generator with Markdown, BEMJSON templates, extensions and build artifacts for nginx and Apache.';
        const brand = data.assets.images['brand/brand.svg'];
        const brandDark = data.assets.images['brand/brand-dark.svg'];
        const favicon = data.assets.images['brand/favicon.svg'];
        const logo = element(url === '/' ? 'span' : 'a', 'brand', [
            ...(brand ? [element('img', 'brand__mark brand__mark_light', null, { src: `/${brand}`, alt: '', width: '62', height: '44' })] : []),
            ...(brandDark ? [element('img', 'brand__mark brand__mark_dark', null, { src: `/${brandDark}`, alt: '', width: '62', height: '44' })] : []),
            element('span', 'brand__name', demo ? 'nuckty demo' : 'nuckty'),
        ], { ...(url === '/' ? {} : { href: '/', 'aria-label': demo ? (ru ? 'nuckty demo — главная' : 'nuckty demo home') : (ru ? 'nuckty — главная' : 'nuckty home') }) });
        const siteUrl = String(data.target?.data?.['siteUrl'] ?? 'http://localhost:8091');
        const demoUrl = String(data.target?.data?.['demoUrl'] ?? 'http://localhost:8092');
        const navigation: BEMTree = demo ? [
            link('/', (ru ? 'Возможности' : 'Features'), '', url === '/'),
            link('/markdown', 'Markdown', '', url === '/markdown'),
            link('/media', (ru ? 'Галерея и сетка' : 'Gallery and grid'), '', url === '/media'),
            link('/playground', (ru ? 'Редактор' : 'Editor'), '', url === '/playground'),
            link('/output', (ru ? 'Файлы' : 'Files'), '', url === '/output'),
            link(siteUrl, (ru ? 'О nuckty ↗' : 'About nuckty ↗')),
        ] : [
            link('/use-cases', ru ? 'Применение' : 'Use cases', '', url === '/use-cases'),
            link('/how/start', ru ? 'Руководство' : 'Get started', '', url === '/how/start'),
            link('/docs', ru ? 'Документация' : 'Docs', '', url !== '/' && url !== '/use-cases' && url !== '/how/start'),
            link(demoUrl, ru ? 'Демо ↗' : 'Demo ↗'),
        ];
        const alternateUrl = `${data.target?.data?.['alternateOrigin'] ?? (ru ? 'https://nuckty.com' : 'https://nuckty.ru')}${url}`;
        const header = element('header', 'header', [
            logo,
            element('nav', 'header__nav', [navigation, ...(!demo ? [link(alternateUrl, ru ? 'English' : 'Русский', 'header__language')] : [])], { id: 'main-nav', 'aria-label': ru ? 'Основная навигация' : 'Main navigation' }),
            element('div', 'header__tools', [
                ...(!demo ? [element('button', 'icon-button search-trigger', [
                    icon('control-icon search-trigger__icon', [element('path', '', null, { d: 'M17 10.5a6.5 6.5 0 1 1 -13 0a6.5 6.5 0 0 1 13 0Z' }), element('path', '', null, { d: 'm16 16 5 5' })]),
                    element('span', 'search-trigger__label', ru ? 'Поиск' : 'Search'),
                ], { type: 'button', 'aria-label': ru ? 'Поиск' : 'Search', 'aria-haspopup': 'dialog', hidden: true })] : []),
                link(alternateUrl, ru ? 'EN' : 'RU', 'language-link'),
                element('button', 'icon-button theme-toggle', [
                    icon('control-icon theme-toggle__moon', element('path', '', null, { d: 'M20.6 13.5A8.5 8.5 0 0 1 10.5 3.4a8.5 8.5 0 1 0 10.1 10.1Z' })),
                    icon('control-icon theme-toggle__sun', [element('path', '', null, { d: 'M16 12a4 4 0 1 1 -8 0a4 4 0 0 1 8 0Z' }), element('path', '', null, { d: 'M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4' })]),
                ], { type: 'button', 'aria-label': ru ? 'Тёмная тема' : 'Dark theme', hidden: true }),
                element('button', 'icon-button menu-toggle', element('span', 'menu-toggle__line', '', { 'aria-hidden': 'true' }), { type: 'button', 'aria-label': ru ? 'Меню' : 'Menu', 'aria-controls': 'main-nav', 'aria-expanded': 'false', hidden: true }),
            ]),
        ]);
        const pages = Object.values(data.sitemap.pages).filter((page) => page.url !== '/' && page.url !== '/use-cases');
        const index = pages.findIndex((page) => page.url === url);
        const neighbors = [pages[index - 1], pages[index + 1]];
        const main: BemNode = landing ? element('main', 'main main_landing', demo ? data.content : { block: 'home', props: { lang: data.lang, demoUrl, example: data.page['homeExample'] } }, { id: 'main' }) : element('main', 'main docs-layout', [
            element('div', 'reading-nav', [
                element('nav', 'breadcrumbs', element('ol', 'breadcrumbs__list', [link('/', demo ? (ru ? 'Демо' : 'Demo') : 'nuckty'), ...data.page.breadcrumbs.filter((route) => route !== url && Boolean(data.sitemap.pages[route])).map((route) => link(route, data.sitemap.pages[route]!.name))].map((item, i) => element('li', 'breadcrumbs__item', [
                    ...(i ? [element('span', 'breadcrumbs__separator', '/', { 'aria-hidden': 'true' })] : []), item,
                ]))), { 'aria-label': ru ? 'Путь к странице' : 'Breadcrumb' }),
            ]),
            element('div', 'article-column', [
                element('article', 'article', data.content),
                element('nav', 'page-navigation', neighbors.map((page, i) => page ? element('a', 'page-navigation__link',
                    element('span', 'page-navigation__name', [
                        element('span', 'page-navigation__text', page.name),
                    ]),
                { href: page.url, rel: i === 0 ? 'prev' : 'next', 'data-direction': i === 0 ? 'previous' : 'next', 'aria-label': `${i === 0 ? (ru ? 'Предыдущая страница' : 'Previous page') : (ru ? 'Следующая страница' : 'Next page')}: ${page.name}` }) : null), { 'aria-label': ru ? 'Соседние страницы' : 'Neighboring pages' }),
            ]),
        ], { id: 'main' });
        const footer = element('footer', 'footer', [
            element('div', 'demo-wordmark', [...'nuckty'].map((letter) => element('span', '', letter)), { 'aria-hidden': 'true' }),
            element('div', 'footer__identity', [
                element(url === '/' ? 'span' : 'a', 'footer__brand', [
                    ...(brand ? [element('img', 'footer__mark brand__mark_light', null, { src: `/${brand}`, alt: '', width: '40', height: '28' })] : []),
                    ...(brandDark ? [element('img', 'footer__mark brand__mark_dark', null, { src: `/${brandDark}`, alt: '', width: '40', height: '28' })] : []),
                    element('strong', '', 'nuckty'),
                ], { ...(url === '/' ? {} : { href: demo ? siteUrl : '/', 'aria-label': ru ? 'nuckty — главная' : 'nuckty home' }) }),
                element('p', 'footer__caption', [element('span', 'footer__made', ru ? 'Сделано на nuckty.' : 'Made with nuckty.'), element('br', '', null), ru ? 'Конечно' : 'Of course']),
            ]),
            element('nav', 'footer__links', [
                link('https://github.com/nuckty/nuckty', 'GitHub'),
                element('a', 'source-link', ru ? 'Исходник страницы' : 'Page source', { href: `https://github.com/nuckty/nuckty-demo/blob/main/content/${data.page.file}`, 'aria-label': ru ? 'Исходник страницы на GitHub' : 'Page source on GitHub' }),
                element('a', 'footer__license', 'MIT', { href: 'https://github.com/nuckty/nuckty/blob/main/LICENSE' }),
            ], { 'aria-label': ru ? 'Дополнительные ссылки' : 'More links' }),
        ]);
        const search = !demo ? element('dialog', 'search-dialog', [
            element('div', 'search-dialog__header', [
                element('label', 'visually-hidden', ru ? 'Поиск в документации' : 'Search documentation', { for: 'search-input' }),
                element('input', 'search-dialog__input', null, { id: 'search-input', type: 'search', placeholder: ru ? 'Найти в документации…' : 'Search documentation…', autocomplete: 'off' }),
                element('button', 'icon-button search-close', 'Esc', { type: 'button', 'aria-label': ru ? 'Закрыть поиск' : 'Close search' }),
            ]),
            element('p', 'search-dialog__hint', ru ? 'Введите название, термин или команду. Поиск работает локально.' : 'Search a title, concept or command. Search runs locally.'),
            element('div', 'search-results', null, { 'aria-live': 'polite' }),
        ], { 'aria-label': ru ? 'Поиск в документации' : 'Search documentation' }) : null;
        const head: BEMTree = [
            element('meta', '', null, { charset: 'utf-8' }),
            element('title', '', title),
            element('meta', '', null, { name: 'viewport', content: 'width=device-width,initial-scale=1' }),
            element('meta', '', null, { name: 'description', content: description }),
            element('meta', '', null, { name: 'color-scheme', content: 'light dark' }),
            element('meta', '', null, { name: 'theme-color', content: '#ddd6c6' }),
            element('link', '', null, { rel: 'canonical', href: `${origin}${url}` }),
            element('meta', '', null, { property: 'og:title', content: title }),
            element('meta', '', null, { property: 'og:description', content: description }),
            element('meta', '', null, { property: 'og:type', content: 'website' }),
            element('meta', '', null, { property: 'og:url', content: `${origin}${url}` }),
            ...(favicon ? [element('link', '', null, { rel: 'icon', type: 'image/svg+xml', href: `/${favicon}` })] : []),
            ...Object.values(data.assets.css).filter((asset) => asset.hash !== 'empty').map((asset) => element('link', '', null, { rel: 'stylesheet', href: asset.url })),
            ...[...data.alternates].map(([lang, alternate]) => element('link', '', null, { rel: 'alternate', hreflang: lang, href: alternate.url })),
        ];

        return {
            tag: 'html', attrs: { lang: data.lang ?? 'ru', 'data-site': demo ? 'demo' : 'website' },
            content: [element('head', '', head), element('body', '', [
                link('#main', ru ? 'К содержимому' : 'Skip to content', 'skip-link'),
                header, main, footer, search,
                ...Object.values(data.assets.js).filter((asset) => asset.hash !== 'empty').map((asset) => element('script', '', '', { src: asset.url, defer: true })),
            ])],
        };
    });
}
