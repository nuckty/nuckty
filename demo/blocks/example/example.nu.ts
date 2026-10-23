import { highlightCode } from '../../ext/highlight.js';
import { block } from 'nuckty';

export default function templates(): void {
    block<{ sample: string; source: string; lang?: string }>('example').replace((node) => {
        const ru = node.props?.lang !== 'en';
        const id = `example-${node.props?.sample}`;

        return {
            block: 'example', tag: 'section', attrs: { 'data-example': id, 'aria-label': (ru ? "Исходник и результат примера" : "Example source and result") },
            content: [
                { elem: 'tabs', tag: 'div', attrs: { role: 'tablist', 'aria-label': (ru ? "Режим примера" : "Example view"), hidden: true }, content: [
                    { elem: 'tab', tag: 'button', attrs: { type: 'button', role: 'tab', id: `${id}-result-tab`, 'aria-selected': 'true', 'aria-controls': `${id}-result`, 'data-view': 'result' }, content: (ru ? "Результат" : "Result") },
                    { elem: 'tab', tag: 'button', attrs: { type: 'button', role: 'tab', id: `${id}-source-tab`, 'aria-selected': 'false', 'aria-controls': `${id}-source`, tabindex: '-1', 'data-view': 'source' }, content: (ru ? "Исходник Markdown" : "Markdown source") },
                    { elem: 'label', tag: 'span', content: `examples/${node.props?.sample}${ru ? "" : ".en"}.md` },
                ] },
                { elem: 'result', tag: 'div', attrs: { id: `${id}-result`, role: 'tabpanel', 'aria-labelledby': `${id}-result-tab`, 'data-panel': 'result', tabindex: '0' }, content: node.content },
                { elem: 'source', tag: 'div', attrs: { id: `${id}-source`, role: 'tabpanel', 'aria-labelledby': `${id}-source-tab`, 'data-panel': 'source', hidden: true, tabindex: '0' }, content: { bem: false, tag: 'pre', content: { bem: false, tag: 'code', content: { raw: highlightCode(node.props?.source ?? '', 'markdown') } } } },
            ],
        };
    });
}
