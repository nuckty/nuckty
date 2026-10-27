import { messages } from './card-example.i18n/index.js';
import type { BemNode } from '@nuckty/core';

export function cardExample(lang: string): BemNode {
    const t = messages(lang);
    return {
        block: 'card',
        content: [
            { elem: 'title', content: t['Field guide'] },
            { elem: 'description', content: t['Markdown guides, with an interface built from blocks.'] },
        ],
    };
}
