import { block, type BEMTree, type BemNode } from 'nuckty';

const el = (tag: string, cls: string, content: BEMTree, attrs: BemNode['attrs'] = {}): BemNode => ({ tag, cls, content, attrs, bem: false });

export default function templates(): void {
    block<{ lang?: string; gallery?: BEMTree; grid?: BEMTree }>('showcase').replace((node) => {
        const ru = node.props?.lang !== 'en';

        return el('div', 'showcase', [
            el('header', 'demo-heading', [
                el('div', '', [
                    el('p', 'eyebrow', (ru ? "NUCKTY / ЖИВЫЕ ПРИМЕРЫ" : "NUCKTY / LIVE EXAMPLES")),
                    el('h1', '', [(ru ? "Меняйте блок. " : "Edit a block. "), el('em', '', (ru ? "Получайте HTML." : "Get HTML."))]),
                    el('p', 'demo-heading__intro', (ru ? "BEMJSON — описание структуры блока. Выберите пример или измените текст: настоящий движок nuckty применит шаблоны и покажет результат." : "BEMJSON describes a block structure. Choose an example or edit its content: the real nuckty engine applies templates and shows the result.")),
                ]),
                el('a', 'demo-heading__guide', (ru ? "Как это устроено ↗" : "How it works ↗"), { href: '/playground' }),
            ]),
            el('div', 'demo-workbench', [
                el('aside', 'demo-nav', [
                    el('p', 'sidebar__label', (ru ? "ЧТО ПОПРОБОВАТЬ" : "WHAT TO TRY")),
                    el('nav', '', [
                        ['01', 'Markdown', (ru ? "Текст, таблицы, ссылки и списки задач" : "Text, tables, links and task lists"), '/markdown'],
                        ['02', (ru ? "Галерея и сетка" : "Gallery and grid"), (ru ? "Лайтбокс и раскладка контента" : "Lightbox and content layout"), '/media'],
                        ['03', (ru ? "Шаблоны nu" : "nu templates"), (ru ? "Правила для блоков и модификаторов" : "Rules for blocks and modifiers"), '/playground'],
                        ['04', (ru ? "Файлы сборки" : "Build files"), (ru ? "HTML, ассеты и сжатые копии" : "HTML, assets and compressed copies"), '/output'],
                    ].map(([number, title, text, href]) => el('a', 'demo-nav__link', [el('span', 'demo-nav__number', number ?? ''), el('strong', '', title ?? ''), el('span', 'demo-nav__description', text ?? ''), el('span', 'demo-nav__arrow', '↗', { 'aria-hidden': 'true' })], { href: href ?? '/' })), { 'aria-label': (ru ? "Подробные примеры" : "Detailed examples") }),
                ]),
                el('div', 'demo-workbench__editor', [
                    { block: 'playground', mods: { compact: true }, props: { lang: node.props?.lang } },
                    el('p', 'demo-workbench__note', (ru ? "BEMJSON → шаблоны nu → HTML. Сборка примера проходит в браузере; предпросмотр открывается в отдельном документе." : "BEMJSON → nu templates → HTML. The example runs in your browser; the preview opens in an isolated document.")),
                ]),
            ]),
            el('section', 'demo-proof', [
                el('div', 'demo-proof__heading', [el('h2', '', (ru ? "Расширения в действии" : "Extensions in action")), el('a', 'text-link', (ru ? "Подробнее о галерее и сетке →" : "Explore gallery and grid →"), { href: '/media' })]),
                el('div', 'demo-proof__grid', [
                    el('div', 'demo-proof__sample', [el('h3', '', (ru ? "Галерея · нажмите на изображение" : "Gallery · select an image")), node.props?.gallery ?? null]),
                    el('div', 'demo-proof__sample', [el('h3', '', (ru ? "Сетка · каждый абзац — ячейка" : "Grid · each paragraph is a cell")), node.props?.grid ?? null]),
                ]),
            ], { id: 'examples' }),
            el('section', 'demo-note', [
                el('div', '', [el('h2', '', (ru ? "Сайт — тоже пример" : "The website is an example too")), el('p', '', (ru ? "Все страницы собраны на nuckty. Markdown, шаблоны, CSS и JavaScript находятся в проекте; размеры файлов можно проверить в текущем артефакте." : "Every page is built with nuckty. The project contains its Markdown, templates, CSS and JavaScript; the output page shows the actual file sizes."))]),
                el('a', 'button button_secondary', (ru ? "Посмотреть файлы сборки →" : "Inspect build files →"), { href: '/output' }),
            ]),
        ]);
    });
}
