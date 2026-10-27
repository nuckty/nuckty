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
import { render, Templates, runWithTemplates, type NucktyEnv } from '@nuckty/core';
import codeTemplates from '../blocks/code/code.nu.js';

const templates = new Templates();
runWithTemplates(templates, codeTemplates);

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
                    parent.children[i] = {
                        type: 'html',
                        value: render(
                            {
                                block: 'code',
                                mods: { wrap: node.lang?.toLowerCase() === 'html' ? 'soft' : undefined },
                                mix: { block: 'article', elem: 'code' },
                                content: {
                                    block: 'code',
                                    elem: 'content',
                                    content: { raw: highlightCode(source, node.lang ?? 'plaintext') },
                                },
                            },
                            { templates },
                        ),
                    };
                } else if (node.children) {
                    visit({ children: node.children });
                }
            }
        }

        visit(tree);
    });
}
