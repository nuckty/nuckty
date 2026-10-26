import type { BemNode } from 'nuckty';

export function cardExample(lang: string): BemNode {
    return {
        block: 'card',
        content: [
            { elem: 'title', content: lang === 'en' ? 'Field guide' : 'Справочник' },
            { elem: 'description', content: lang === 'en' ? 'Markdown guides, with an interface built from blocks.' : 'Руководства в Markdown. Интерфейс, собранный из блоков.' },
        ],
    };
}
