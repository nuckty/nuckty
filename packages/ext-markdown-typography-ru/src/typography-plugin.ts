/** Optional prose typography; code, raw HTML and attribute values stay literal. */
import type { Plugin } from 'unified';
import type { Root } from 'mdast';
import { applyRussianTypography } from './typography.js';

interface Node {
    type: string;
    value?: string;
    children?: Node[];
}

export const remarkTypographyRu: Plugin<[], Root> = () => (tree: Root) => {
    const walk = (node: Node): void => {
        let literalDepth = 0;
        for (const child of node.children ?? []) {
            if (child.type === 'html') {
                for (const tag of child.value?.matchAll(/<(\/)?(pre|code|script|style)(?=[\s/>])[^>]*>/gi) ?? []) {
                    literalDepth = Math.max(0, literalDepth + (tag[1] ? -1 : 1));
                }
            } else if (!literalDepth) {
                if (child.type === 'text' && child.value !== undefined) {
                    child.value = applyRussianTypography(child.value);
                } else {
                    walk(child);
                }
            }
        }
    };
    walk(tree);
};

