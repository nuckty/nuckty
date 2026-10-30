/**
 * Default templates of the `article` entities produced by the Markdown bridge.
 * Every build registers them before the site's templates, so a site template
 * for the same entity is declared later, wins, and reaches these through `next()`.
 *
 * @module markdown/templates
 */

import { block } from '../bem/api.js';
import { attributes } from '../bem/compose.js';

export default function markdownTemplates(): void {
    block('article').elem('paragraph')({ tag: 'p' });
    for (const level of ['1', '2', '3', '4', '5', '6']) {
        block('article').elem('heading').mod('level', level)({ tag: `h${level}` });
    }
    block('article').elem('heading')({
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['id']) }),
    });
    block('article').elem('heading-anchor')({
        tag: 'a',
        attrs: (node, next) => ({
            ...next(),
            ...attributes(node, ['href']),
            ...(typeof node.props?.['label'] === 'string' ? { 'aria-label': node.props['label'] } : {}),
        }),
    });
    block('article').elem('list')({
        tag: 'ul',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['start']) }),
    });
    block('article').elem('list').mod('ordered')({ tag: 'ol' });
    block('article').elem('list-item')({ tag: 'li' });
    block('article').elem('task')({
        tag: 'input',
        bem: false,
        attrs: (node, next) => ({
            ...next(),
            type: 'checkbox',
            disabled: true,
            checked: node.props?.['checked'] === true,
            ...(typeof node.props?.['label'] === 'string' && node.props['label'] ? { 'aria-label': node.props['label'] } : {}),
        }),
    });
    block('article').elem('code')({ tag: 'pre' });
    block('article').elem('code-text')({ tag: 'code', bem: false });
    block('article').elem('inline-code')({ tag: 'code' });
    block('article').elem('blockquote')({ tag: 'blockquote' });
    block('article').elem('table')({ tag: 'table' });
    block('article').elem('table-head')({ tag: 'thead' });
    block('article').elem('table-body')({ tag: 'tbody' });
    block('article').elem('table-row')({ tag: 'tr' });
    block('article').elem('table-cell')({
        tag: 'td',
        attrs: (node, next) => ({
            ...next(),
            ...(typeof node.props?.['align'] === 'string' ? { style: `text-align:${node.props['align']}` } : {}),
        }),
    });
    block('article').elem('table-cell').mod('header')({ tag: 'th' });
    block('article').elem('link')({
        tag: 'a',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['href', 'title']) }),
    });
    block('article').elem('image')({
        tag: 'img',
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['src', 'alt', 'title']) }),
    });
    block('article').elem('rule')({ tag: 'hr', bem: false });
    block('article').elem('break')({ tag: 'br', bem: false });
    block('article').elem('strong')({ tag: 'strong', bem: false });
    block('article').elem('emphasis')({ tag: 'em', bem: false });
    block('article').elem('delete')({ tag: 'del', bem: false });
    block('article').elem('footnote')({
        tag: 'div',
        bem: false,
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['id']) }),
    });
    block('article').elem('footnote-ref')({ tag: 'sup', bem: false });
    block('article').elem('footnote-link')({
        tag: 'a',
        bem: false,
        attrs: (node, next) => ({ ...next(), ...attributes(node, ['href']) }),
    });
}
