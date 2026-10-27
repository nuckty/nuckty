import { highlightCode } from '../../ext/highlight.js';
import { cardExample } from '../playground/card-example.js';
import { block, type BEMTree, type BemNode } from '@nuckty/core';

const el = (tag: string, cls: string, content: BEMTree, attrs: BemNode['attrs'] = {}): BemNode => ({ tag, cls, content, attrs, bem: false });
const arrow = (): BemNode => el('svg', 'demo-arrow', el('path', '', null, { d: 'M5 19 19 5M5 5h14v14' }), { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.3', 'aria-hidden': 'true' });

export default function templates(): void {
    block<{ lang?: string; gallery?: BEMTree; grid?: BEMTree }>('showcase').replace((node) => {
        const ru = node.props?.lang !== 'en';
        const card = cardExample(ru ? 'ru' : 'en');
        const source = JSON.stringify(card, null, 2).replace(/\{\n\s+"elem": ("[^"]+"),\n\s+"content": (".*")\n\s+}/g, '{"elem": $1, "content": $2}');
        const examples = [
            ['Markdown', ru ? 'Текст, таблицы, ссылки и списки задач.' : 'Text, tables, links and task lists.', '/markdown'],
            [ru ? 'Галерея и сетка' : 'Gallery and grid', ru ? 'Изображения, лайтбокс и раскладка контента.' : 'Images, a lightbox and content layout.', '/media'],
            [ru ? 'Шаблоны nu.ts' : 'nu.ts templates', ru ? 'Правила для блоков и модификаторов.' : 'Rules for blocks and modifiers.', '/playground'],
            [ru ? 'Файлы сборки' : 'Build files', ru ? 'HTML, ассеты и сжатые копии.' : 'HTML, assets and compressed copies.', '/output'],
        ];

        return el('div', 'showcase', [
            el('section', 'demo-hero', [
                el('div', 'demo-hero__name demo-tile', [
                    el('h1', '', [el('span', '', 'nuckty'), ' ', el('span', '', 'demo')]),
                    el('p', '', ru ? 'Меняйте контент. Следите, как дерево блоков становится страницей.' : 'Change the content. Follow a tree of blocks as it becomes a page.'),
                    el('div', 'demo-hero__meta', [el('span', '', 'BEMJSON → nu → HTML'), el('a', '', ru ? 'Исходный код ↗' : 'Open source ↗', { href: 'https://github.com/nuckty/nuckty-demo' })]),
                ]),
                el('figure', 'demo-hero__source demo-tile', [
                    el('figcaption', 'demo-fragment', [el('span', '', 'card.bemjson'), el('span', '', 'BEMJSON')]),
                    el('pre', '', el('code', '', { raw: highlightCode(source, 'json') })),
                    el('p', 'demo-fragment', ru ? 'Контент как дерево блоков.' : 'Content, as a tree of blocks.'),
                ], { id: 'demo-card-source' }),
                el('div', 'demo-hero__output demo-tile', [
                    el('div', 'demo-fragment', [el('span', '', ru ? 'Результат движка' : 'The rendered block'), el('span', '', 'HTML')]),
                    el('div', 'demo-hero__sample', [el('span', 'demo-hero__glyph', '{ }', { 'aria-hidden': 'true' }), card]),
                    el('div', 'demo-fragment', [el('span', '', ru ? 'Тот же контент. Ваша разметка.' : 'Same content. Your markup.'), el('a', '', ru ? 'Изменить ↓' : 'Try changing it ↓', { href: '#playground' })]),
                ], { id: 'demo-card-result' }),
                el('div', 'demo-hero__statement demo-tile', [
                    el('h2', '', ru ? 'Текст и блоки.' : 'Text and blocks.'),
                    el('p', '', ru ? 'Markdown для контента. TypeScript для шаблонов. HTML для читателя.' : 'Markdown for content. TypeScript for templates. HTML for the reader.'),
                ]),
                el('a', 'demo-hero__start demo-tile', [el('span', '', ru ? 'Ваш контент. Ваша разметка.' : 'Your content. Your markup.'), arrow(), el('span', '', ru ? 'Попробовать редактор' : 'Try the editor')], { href: '#playground' }),
            ]),
            el('nav', 'demo-nav', examples.map(([title, text, href]) => el('a', 'demo-nav__link demo-tile', [el('h2', '', title ?? ''), el('p', '', text ?? ''), arrow()], { href: href ?? '/' })), { 'aria-label': ru ? 'Подробные примеры' : 'Detailed examples' }),
            el('section', 'demo-workbench', [
                el('div', 'demo-section-heading', [el('h2', '', ru ? 'Попробуйте блок.' : 'Try a block.'), el('p', '', ru ? 'Выберите пример или измените BEMJSON. Настоящий движок nuckty применит шаблоны и покажет HTML.' : 'Choose an example or edit the BEMJSON. The real nuckty engine applies templates and shows the HTML.')]),
                { block: 'playground', mods: { compact: true }, props: { lang: node.props?.lang } },
                el('p', 'demo-workbench__note', ru ? 'Пример собирается в браузере. Предпросмотр открыт в отдельном документе с ограничениями sandbox.' : 'The example runs in your browser. The preview opens in a separate sandboxed document.'),
            ], { id: 'playground' }),
            el('section', 'demo-proof', [
                el('div', 'demo-section-heading', [el('h2', '', ru ? 'Расширения в действии.' : 'Extensions in action.'), el('a', 'text-link', ru ? 'Галерея и сетка ↗' : 'Gallery and grid ↗', { href: '/media' })]),
                el('div', 'demo-proof__grid', [
                    el('div', 'demo-proof__sample demo-tile', [el('h3', '', ru ? 'Галерея' : 'Gallery'), el('p', '', ru ? 'Нажмите на изображение, чтобы открыть лайтбокс.' : 'Select an image to open the lightbox.'), node.props?.gallery ?? null]),
                    el('div', 'demo-proof__sample demo-tile', [el('h3', '', ru ? 'Сетка' : 'Grid'), el('p', '', ru ? 'Каждый абзац Markdown становится ячейкой.' : 'Each Markdown paragraph becomes a cell.'), node.props?.grid ?? null]),
                ]),
            ], { id: 'examples' }),
            el('section', 'demo-note', [
                el('div', 'demo-tile', [el('h2', '', ru ? 'Сайт — тоже пример.' : 'The website is an example too.'), el('p', '', ru ? 'Все страницы собраны на nuckty. Контент, шаблоны, CSS и JavaScript находятся в проекте.' : 'Every page is built with nuckty. Content, templates, CSS and JavaScript live in the project.')]),
                el('a', 'demo-note__link demo-tile', [el('span', '', ru ? 'Посмотреть файлы сборки' : 'Inspect build files'), arrow(), el('span', '', ru ? 'Размеры и хэши текущих файлов' : 'Sizes and hashes of the current files')], { href: '/output' }),
            ]),
        ]);
    });
}
