import { createHighlighter, renderTokens } from '@tanstack/highlight/core';
import { ts } from '@tanstack/highlight/languages/ts';
import { js } from '@tanstack/highlight/languages/js';
import { html } from '@tanstack/highlight/languages/html';
import { css } from '@tanstack/highlight/languages/css';
import { json } from '@tanstack/highlight/languages/json';
import { yaml } from '@tanstack/highlight/languages/yaml';
import { shell } from '@tanstack/highlight/languages/shell';
import { nginx } from '@tanstack/highlight/languages/nginx';
import { markdown } from '@tanstack/highlight/languages/markdown';
import type { BEMTree, MarkdownNodeHandler, NucktyEnv } from '@nuckty/core';

/** A node of the highlighter's token tree. */
interface TokenNode {
    type: string;
    value?: string;
    classNames?: string[];
    children?: TokenNode[];
}

const highlighter = createHighlighter({ languages: [ts, js, html, css, json, yaml, shell, nginx, markdown] });

/** Convert the token tree to `code__token` elements; the token kind is a modifier. */
function tokensToBem(nodes: TokenNode[]): BEMTree[] {
    return nodes.map((node): BEMTree => {
        if (node.type !== 'element') {
            return node.value ?? '';
        }
        const kind = node.classNames?.find((name) => name.startsWith('th-') && name !== 'th-token')?.slice(3);

        return { block: 'code', elem: 'token', ...(kind ? { elemMods: { kind } } : {}), content: tokensToBem(node.children ?? []) };
    });
}

/** Highlighted source as BEMJSON for the `code` block. */
export function highlightCode(source: string, language: string): BEMTree {
    const { tokens } = highlighter.tokenize(source, { lang: language });

    return tokensToBem(renderTokens(tokens) as TokenNode[]);
}

/** Render fenced code as the `code` block with highlighted tokens. */
const codeHandler: MarkdownNodeHandler = (node) => {
    const value = typeof node['value'] === 'string' ? node['value'] : '';
    const lang = typeof node['lang'] === 'string' ? node['lang'] : 'plaintext';

    return {
        block: 'code',
        mods: { wrap: lang.toLowerCase() === 'html' ? 'soft' : undefined },
        mix: { block: 'article', elem: 'code' },
        content: { block: 'code', elem: 'content', content: highlightCode(value ? `${value}\n` : '', lang) },
    };
};

export function register(env: NucktyEnv): void {
    env.markdown.node('code', codeHandler);
}
