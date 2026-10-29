/** Optional prose typography; code, raw HTML and attribute values stay literal. */
import type { Plugin, Root } from '@nuckty/core';
import { applyRussianTypography } from './typography.js';

interface Node {
    type: string;
    value?: string;
    children?: Node[];
}

export const remarkTypographyRu: Plugin<[], Root> = () => (tree: Root) => {
    const walk = (node: Node): void => {
        let literalDepth = 0;
        let previous: Node | undefined;
        for (const child of node.children ?? []) {
            if (child.type === 'html') {
                for (const tag of child.value?.matchAll(/<(\/)?(pre|code|script|style)(?=[\s/>])[^>]*>/gi) ?? []) {
                    literalDepth = Math.max(0, literalDepth + (tag[1] ? -1 : 1));
                }
            } else if (!literalDepth) {
                if (child.type === 'text' && child.value !== undefined) {
                    // A dash that follows inline markup (link, emphasis, code) starts its
                    // own text node; bind it to that markup like a dash after a word.
                    const value = previous && previous.type !== 'break'
                        ? child.value.replace(/^[ \t\u00a0]+—[ \t\u00a0]*/, '\u00a0— ')
                        : child.value;
                    child.value = applyRussianTypography(value);
                } else {
                    walk(child);
                }
            }
            previous = child;
        }
    };
    walk(tree);
};

