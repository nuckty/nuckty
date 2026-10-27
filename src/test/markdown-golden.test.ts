import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMarkdown } from '../markdown/index.js';
import { render } from '../bem/render.js';
import { Templates } from '../bem/templates.js';

const NO_TEMPLATES = { templates: new Templates() };

function mdToHtml(src: string, opts: Parameters<typeof createMarkdown>[0] = {}): string {
    // Markdown-bridge golden fixtures (structural contract — BEM classes, anchor
    // ids, the code-copy button). Typography is an extension
    // (@nuckty/ext-markdown-typography-ru) and is not applied here; a fixture that
    // asserts typographic output lives in the extension.
    const { render: renderMd } = createMarkdown(opts);
    const { tree } = renderMd(src);
    return render({ block: 'article', content: tree }, NO_TEMPLATES);
}

// Fixture 1 — common_account.html: paragraph, ordered list of anchor links,
// heading with cyrillic anchor, link to another page.
test('golden common_account: paragraph + ordered list of anchor links + heading anchor', () => {
    const md = [
        'Создание учётной записи состоит из нескольких шагов:',
        '',
        '1. [Создание учётной записи WeChat](#wechat)',
        '2. [Заведение китайского номера eSender](#esender-китайский-номер)',
        '3. [Установка приложения Lantu](#установка-приложения)',
        '4. [Создание аккаунта в приложении Lantu](#создание-аккаунта)',
        '',
        '[Что можно делать в приложении](/common/app).',
        '',
        '# WeChat',
    ].join('\n');
    const html = mdToHtml(md);
    assert.ok(html.includes('<p class=article__paragraph>Создание учётной записи состоит из нескольких шагов:'), 'paragraph');
    assert.ok(html.includes('<ol class="article__list article__list_ordered">'), 'ordered list class+mod');
    assert.ok(html.includes('<a class=article__link href=#wechat>Создание учётной записи WeChat</a>'), 'anchor link href=#wechat');
    assert.ok(html.includes('href=#esender-китайский-номер'), 'cyrillic anchor preserved (esender-китайский-номер)');
    assert.ok(html.includes('href=#установка-приложения'), 'cyrillic anchor (установка-приложения)');
    assert.ok(html.includes('<a class=article__link href=/common/app>Что можно делать в приложении</a>'), 'page link');
    // Heading anchor: href precedes class (raw node), Cyrillic verbatim.
    assert.ok(html.includes('<h1 class="article__heading article__heading_level_1" id=wechat><a class=article__heading-anchor href=#wechat>WeChat</a></h1>'), 'heading anchor');
});

// Fixture 2 — free_12v.html: blockquote wrapping a paragraph (spec blockquote
// class is `article__blockquote`, NOT `article__quote`).
test('golden free_12v: blockquote uses article__blockquote and wraps <p>', () => {
    const md = '> Типоразмер: B20 JIS 197×129×227\n> Полярность: Обратная\n';
    const html = mdToHtml(md);
    assert.ok(html.includes('<blockquote class=article__blockquote>'), 'blockquote class is article__blockquote (not article__quote)');
    assert.ok(html.includes('article__paragraph'), 'blockquote wraps content in <p>');
    assert.ok(html.includes('Типоразмер: B20 JIS 197×129×227'), 'blockquote text');
    assert.ok(!html.includes('article__quote'), 'article__quote must not appear');
});

// Fixture 3 — common_cable.html: fenced code block with the copy button.
test('golden common_cable: code block with copy button (article__code-copy)', () => {
    const md = '```\nadb connect 192.168.43.1:5578\n```\n';
    const html = mdToHtml(md);
    assert.ok(html.includes('<pre class=article__code>'), 'pre class=article__code');
    assert.ok(html.includes('<code>adb connect 192.168.43.1:5578\n</code>'), 'inner code (bem:false, no class, trailing \\n kept per markdown-it)');
    assert.ok(
        html.includes('<button type=button class=article__code-copy aria-label="Copy code to clipboard" title="Copy code"></button>'),
        'copy button with attrs type,class,aria-label,title in that order',
    );
});

// Fixture 4 — dreamer_models.html: GFM table with header cells.
test('golden dreamer_models: GFM table with header + body cells', () => {
    const md = '| Старт продаж | 05.2022 |\n| --- | --- |\n| Двигатель | 1.5T |\n';
    const html = mdToHtml(md);
    assert.ok(html.includes('<table class=article__table>'), 'table class');
    assert.ok(html.includes('<thead class=article__table-head>'), 'thead');
    assert.ok(html.includes('<th class="article__table-cell article__table-cell_header">Старт продаж'), 'header cell with header mod');
    assert.ok(html.includes('<th class="article__table-cell article__table-cell_header">05.2022'), 'second header cell');
    assert.ok(html.includes('<tbody class=article__table-body>'), 'tbody');
    assert.ok(html.includes('<td class=article__table-cell>Двигатель'), 'body cell');
});

// Fixture 6 — nested list (common_account had ul inside ol).
test('golden common_account: nested ul inside ol', () => {
    const md = [
        '1. Подтверждение аккаунта:',
        '   - Найти того, кто подтвердит ваш QR-код.',
        '   - Написать в поддержку WeChat.',
    ].join('\n');
    const html = mdToHtml(md);
    assert.ok(html.includes('<ol class="article__list article__list_ordered">'), 'outer ol');
    assert.ok(html.includes('<ul class=article__list>'), 'nested ul');
    assert.ok(html.includes('Написать в поддержку WeChat'), 'nested item text');
});

// Fixture 7 — inline code in a list item (common_account: `esender`).
test('golden common_account: inline code inside list item', () => {
    const md = '1. В поле поиска наверху написать `esender`';
    const html = mdToHtml(md);
    assert.ok(html.includes('<li class=article__list-item>'), 'list item');
    assert.ok(html.includes('<code class="article__inline-code">esender</code>'), 'inline code inside list item');
});

// Fixture 8 — external links with parens (common_account: apkpure / apple).
test('golden common_account: external links with parentheses in text', () => {
    const md = 'Установить WeChat на телефон ([Android](https://apkpure.net/wechat/com.tencent.mm), [iOS](https://apps.apple.com/ru/app/wechat/id414478124))';
    const html = mdToHtml(md);
    assert.ok(html.includes('href=https://apkpure.net/wechat/com.tencent.mm>Android</a>'), 'apkpure link');
    assert.ok(html.includes('href=https://apps.apple.com/ru/app/wechat/id414478124>iOS</a>'), 'apple link');
});
