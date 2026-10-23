import { createHighlighter, renderNodesToHtml, renderTokens } from '@tanstack/highlight/core';
import { ts } from '@tanstack/highlight/languages/ts';
import { js } from '@tanstack/highlight/languages/js';
import { html } from '@tanstack/highlight/languages/html';
import { css } from '@tanstack/highlight/languages/css';
import { json } from '@tanstack/highlight/languages/json';
import { yaml } from '@tanstack/highlight/languages/yaml';
import { shell } from '@tanstack/highlight/languages/shell';
import { nginx } from '@tanstack/highlight/languages/nginx';
import { markdown } from '@tanstack/highlight/languages/markdown';
import type { NucktyEnv } from 'nuckty';

interface SyntaxNode {
    type: string;
    value?: string;
    lang?: string | null;
    children?: SyntaxNode[];
}

const highlighter = createHighlighter({ languages: [ts, js, html, css, json, yaml, shell, nginx, markdown] });

export function highlightCode(source: string, language: string): string {
    const { tokens } = highlighter.tokenize(source, { lang: language });

    return renderNodesToHtml(renderTokens(tokens));
}

export function register(env: NucktyEnv): void {
    env.markdown.use(() => (tree: { children: SyntaxNode[] }) => {
        function visit(parent: { children: SyntaxNode[] }): void {
            for (let i = 0; i < parent.children.length; i++) {
                const node = parent.children[i]!;

                if (node.type === 'code') {
                    const source = node.value ? `${node.value}\n` : '';
                    parent.children[i] = { type: 'html', value: `<pre class=article__code><code>${highlightCode(source, node.lang ?? 'plaintext')}</code></pre>` };
                } else if (node.children) {
                    visit({ children: node.children });
                }
            }
        }

        visit(tree);
    });
}

