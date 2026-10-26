import { block, type BemNode } from 'nuckty';

export default function templates(): void {
    block<{ lang?: string }>('playground').replace((node) => {
        const ru = node.props?.lang !== 'en';
        const compact = node.mods?.['compact'] === true;
        const input: BemNode = { elem: 'input', content: [
            { bem: false, tag: 'label', cls: 'playground__label', attrs: { for: 'playground-input' }, content: (ru ? "BEMJSON · редактируйте здесь" : "BEMJSON \u00b7 edit here") },
            { bem: false, tag: 'textarea', attrs: { id: 'playground-input', rows: '19', spellcheck: 'false', autocomplete: 'off', autocapitalize: 'off', 'aria-describedby': 'playground-error' }, content: '' },
        ] };
        const output: BemNode = { elem: 'output', content: [
            { bem: false, tag: 'p', cls: 'playground__label', content: (ru ? "HTML · результат движка" : "HTML \u00b7 engine output") },
            { bem: false, tag: 'pre', attrs: { id: 'playground-html', tabindex: '0' }, content: '' },
            { bem: false, tag: 'details', attrs: { open: false }, content: [
                { bem: false, tag: 'summary', content: (ru ? "Дерево после шаблонов" : "Tree after templates") },
                { bem: false, tag: 'pre', attrs: { id: 'playground-tree', tabindex: '0' }, content: '' },
            ] },
        ] };
        const preview: BemNode = { elem: 'preview-pane', attrs: { hidden: true }, content: [
            { bem: false, tag: 'p', cls: 'playground__label playground__preview-label', content: (ru ? "Предпросмотр" : "Preview") },
            { bem: false, tag: 'iframe', cls: 'playground__preview', attrs: { id: 'playground-preview', title: (ru ? "Предпросмотр BEMJSON" : "BEMJSON preview"), sandbox: '' }, content: '' },
        ] };

        return {
            block: 'playground', mods: node.mods, tag: 'section', attrs: { 'aria-label': (ru ? "Редактор BEMJSON" : "BEMJSON editor") },
            content: [
                { bem: false, tag: 'p', cls: 'playground__fallback', content: (ru ? "Для живого редактора нужен JavaScript. Галерея, сетка и примеры Markdown доступны без него." : "The live editor requires JavaScript. Gallery, grid and Markdown examples work without it.") },
                { elem: 'toolbar', attrs: { hidden: true }, content: [
                    { bem: false, tag: 'label', attrs: { for: 'playground-preset' }, content: (ru ? "Пример" : "Example") },
                    { bem: false, tag: 'select', attrs: { id: 'playground-preset' }, content: [
                        { bem: false, tag: 'option', attrs: { value: 'card' }, content: (ru ? "Карточка" : "Card") },
                        { bem: false, tag: 'option', attrs: { value: 'list' }, content: (ru ? "Список" : "List") },
                        { bem: false, tag: 'option', attrs: { value: 'button' }, content: (ru ? "Кнопка с модификатором" : "Button with a modifier") },
                        { bem: false, tag: 'option', attrs: { value: 'escaping' }, content: (ru ? "Экранирование" : "Escaping") },
                    ] },
                    { bem: false, tag: 'button', attrs: { type: 'button', id: 'playground-reset' }, content: (ru ? "Сбросить" : "Reset") },
                    { bem: false, tag: 'button', attrs: { type: 'button', id: 'playground-copy', 'aria-label': (ru ? "Скопировать HTML примера" : "Copy example HTML") }, content: (ru ? "Копировать HTML" : "Copy HTML") },
                    { bem: false, tag: 'span', cls: 'playground__status', attrs: { id: 'playground-status', 'aria-live': 'polite' }, content: (ru ? "Загрузка движка…" : "Loading the engine\u2026") },
                ] },
                { elem: 'columns', attrs: { hidden: true }, content: compact ? [input, output, preview] : [input, output] },
                { elem: 'error', tag: 'p', attrs: { id: 'playground-error', role: 'status', hidden: true }, content: '' },
                ...(compact ? [] : [preview]),
            ],
        };
    });
}
