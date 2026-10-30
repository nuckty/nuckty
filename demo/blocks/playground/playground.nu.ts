import { messages } from './playground.i18n/index.js';
import { block, type BemNode, b, attributes } from '@nuckty/core';

function playgroundTree(
    node: Omit<BemNode, 'props'> & {
        props?: {
            lang?: string;
        };
    },
): BemNode {
    const locale = node.props?.lang;
    const t = messages(locale);
    const compact = node.mods?.['compact'] === true;
    const input: BemNode = {
        elem: 'input',
        content: [b('playground', 'label', t['BEMJSON · edit here']), b('playground', 'editor', '')],
    };
    const output: BemNode = {
        elem: 'output',
        content: [
            b(
                'playground',
                'output-label',
                t['HTML · engine output'],
                {},
                { mix: [{ block: 'playground', elem: 'label' }] },
            ),
            b('code', undefined, '', { id: 'playground-html', tabindex: '0' }, { mods: { wrap: 'soft' } }),
            b('playground', 'details', [
                b('playground', 'summary', t['Tree after templates']),
                b('playground', 'snippet', ''),
            ]),
        ],
    };
    const preview: BemNode = {
        elem: 'preview-pane',
        content: [
            b(
                'playground',
                'output-label',
                t['Preview'],
                {},
                {
                    mix: [
                        { block: 'playground', elem: 'label' },
                        { block: 'playground', elem: 'preview-label' },
                    ],
                },
            ),
            b('playground', 'preview', '', { title: t['BEMJSON preview'] }),
        ],
    };
    return b(
        'playground',
        undefined,
        [
            b(
                'playground',
                'fallback',
                t['The live editor requires JavaScript. Gallery, grid and Markdown examples work without it.'],
            ),
            {
                elem: 'toolbar',
                content: [
                    b('playground', 'input-label', t['Example']),
                    b('playground', 'preset', [
                        b('playground', 'option', t['Card'], { value: 'card' }),
                        b('playground', 'option', t['List'], { value: 'list' }),
                        b('playground', 'option', t['Button with a modifier'], { value: 'button' }),
                        b('playground', 'option', t['Escaping'], { value: 'escaping' }),
                    ]),
                    b('playground', 'action', t['Reset'], { id: 'playground-reset' }),
                    b('playground', 'action', t['Copy HTML'], {
                        id: 'playground-copy',
                        'aria-label': t['Copy example HTML'],
                    }),
                    b('playground', 'status', t['Loading the engine…']),
                ],
            },
            { elem: 'columns', content: compact ? [input, output, preview] : [input, output] },
            b('playground', 'error', ''),
            ...(compact ? [] : [preview]),
        ],
        { 'aria-label': t['BEMJSON editor'] },
        { mods: node.mods },
    );
}

export default function templates(): void {
    block('playground').elem('toolbar')({ attrs: { hidden: true } });
    block('playground').elem('columns')({ attrs: { hidden: true } });
    block('playground').elem('preview-pane')({ attrs: { hidden: true } });
    block('playground').elem('label')({
        tag: 'label',
        attrs: (node, next) => ({ for: 'playground-input', ...next(), ...attributes(node, ['for']) }),
    });
    block('playground').elem('editor')({
        tag: 'textarea',
        attrs: (node, next) => ({
            id: 'playground-input',
            rows: '19',
            spellcheck: 'false',
            autocomplete: 'off',
            autocapitalize: 'off',
            'aria-describedby': 'playground-error',
            ...next(),
            ...attributes(node, ['id', 'rows', 'spellcheck', 'autocomplete', 'autocapitalize', 'aria-describedby']),
        }),
    });
    block('playground').elem('output-label')({
        tag: 'p',
    });
    block('playground').elem('summary')({
        tag: 'summary',
    });
    block('playground').elem('snippet')({
        tag: 'pre',
        attrs: (node, next) => ({
            id: 'playground-tree',
            tabindex: '0',
            ...next(),
            ...attributes(node, ['id', 'tabindex']),
        }),
    });
    block('playground').elem('details')({
        tag: 'details',
        attrs: (node, next) => ({ open: false, ...next(), ...attributes(node, ['open']) }),
    });
    block('playground').elem('preview')({
        tag: 'iframe',
        attrs: (node, next) => ({
            id: 'playground-preview',
            sandbox: '',
            ...next(),
            ...attributes(node, ['id', 'title', 'sandbox']),
        }),
    });
    block('playground').elem('fallback')({
        tag: 'p',
    });
    block('playground').elem('input-label')({
        tag: 'label',
        attrs: (node, next) => ({ for: 'playground-preset', ...next(), ...attributes(node, ['for']) }),
    });
    block('playground').elem('option')({
        tag: 'option',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['value']) }),
    });
    block('playground').elem('preset')({
        tag: 'select',
        attrs: (node, next) => ({ id: 'playground-preset', ...next(), ...attributes(node, ['id']) }),
    });
    block('playground').elem('action')({
        tag: 'button',
        attrs: (node, next) => ({ type: 'button', ...next(), ...attributes(node, ['type', 'id', 'aria-label']) }),
    });
    block('playground').elem('status')({
        tag: 'span',
        attrs: (node, next) => ({
            id: 'playground-status',
            'aria-live': 'polite',
            ...next(),
            ...attributes(node, ['id', 'aria-live']),
        }),
    });
    block('playground').elem('error')({
        tag: 'p',
        attrs: (node, next) => ({
            id: 'playground-error',
            role: 'status',
            hidden: true,
            ...next(),
            ...attributes(node, ['id', 'role', 'hidden']),
        }),
    });
    block('playground')({
        tag: 'section',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['aria-label']) }),
    });
    block<{ lang?: string }>('playground')
        .when((node) => Boolean(node.props))
        .replace(playgroundTree);
}
