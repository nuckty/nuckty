import { messages } from './playground.i18n/index.js';
// The public browser entry is bundled into the static demo by nuckty's JS stage.
import { Templates, render } from '@nuckty/core/browser';
import { cardExample } from './card-example.ts';

const locale = document.documentElement.lang;
const t = messages(locale);
const input = document.querySelector('#playground-input');

if (input) {
    const templates = new Templates();
    templates.add({ block: 'card', modes: { tag: 'article' } });
    templates.add({ block: 'card', elem: 'title', modes: { tag: 'h2' } });
    templates.add({ block: 'card', elem: 'description', modes: { tag: 'p' } });
    templates.add({
        block: 'button',
        modes: { tag: 'button', attrs: (_node, next) => ({ ...next(), type: 'button' }) },
    });
    templates.add({
        block: 'button',
        modName: 'disabled',
        modes: { attrs: (_node, next) => ({ ...next(), disabled: true }) },
    });
    templates.add({ block: 'list', modes: { tag: 'ul' } });
    templates.add({ block: 'list', elem: 'item', modes: { tag: 'li' } });
    templates.add({ block: 'message', modes: { tag: 'p' } });
    const presets = {
        card: cardExample(locale),
        list: {
            block: 'list',
            content: ['Markdown', 'BEMJSON', 'HTML'].map((content) => ({ elem: 'item', content })),
        },
        button: { block: 'button', mods: { disabled: true }, content: t['Button with a modifier'] },
        escaping: { block: 'message', content: t['<script>alert("Just text")</script> & nuckty'] },
    };
    const select = document.querySelector('#playground-preset');
    const error = document.querySelector('#playground-error');
    const status = document.querySelector('#playground-status');
    const frame = document.querySelector('#playground-preview');
    const htmlOutput = document.querySelector('#playground-html');
    const treeOutput = document.querySelector('#playground-tree');
    const copyButton = document.querySelector('#playground-copy');

    function update() {
        try {
            const tree = JSON.parse(input.value);
            const resolved = render(tree, { templates, output: 'bemjson' });
            const html = render(tree, { templates });
            htmlOutput.textContent = html;
            treeOutput.textContent = JSON.stringify(resolved, null, 2);
            frame.srcdoc = `<!doctype html><html lang="${locale}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:1.5rem;font:clamp(1.0625rem,1rem + .3vw,1.25rem)/1.6 Georgia,serif;background:#eee9df;color:#2a2a26;overflow-wrap:anywhere}.card{padding:0;max-width:40rem}.card__title{margin:0 0 1.125rem;font:800 clamp(1.875rem,5vw,3.375rem)/1.1 system-ui,sans-serif;letter-spacing:-.05em}.card__description{margin:0;font-size:clamp(1.125rem,2vw,1.5rem)}.card_color_orange{background:#d2cab8;padding:1.25rem}button{padding:.75rem 1.25rem;background:#4f6238;color:white;border:0}button:disabled{opacity:.5}pre{white-space:pre-wrap}</style><body>${html}`;
            error.textContent = '';
            input.removeAttribute('aria-invalid');
            status.textContent = `${new TextEncoder().encode(html).length} ${t['bytes of HTML']}`;
            copyButton.disabled = false;
        } catch (reason) {
            error.textContent = `${t['Could not render the example']}: ${reason.message}`;
            input.setAttribute('aria-invalid', 'true');
            status.textContent = t['Check the JSON'];
            htmlOutput.textContent = '';
            treeOutput.textContent = '';
            frame.srcdoc = '';
            copyButton.disabled = true;
        }
    }

    function fitInput() {
        input.style.height = '0px';
        const minimum = parseFloat(getComputedStyle(input).minHeight);
        input.style.height = `${Math.max(minimum, input.scrollHeight)}px`;
    }

    function reset() {
        input.value = JSON.stringify(presets[select.value], null, 2);
        fitInput();
        update();
    }

    window.addEventListener('resize', fitInput);
    input.addEventListener('input', update);
    select.addEventListener('change', reset);
    document.querySelector('#playground-reset').addEventListener('click', reset);
    copyButton.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(htmlOutput.textContent);
            copyButton.textContent = t['Copied'];
        } catch {
            copyButton.textContent = t['Select HTML'];
        }

        setTimeout(() => {
            copyButton.textContent = t['Copy HTML'];
        }, 1600);
    });
    for (const panel of document.querySelectorAll(
        '.playground__toolbar, .playground__columns, .playground__preview-pane, .playground__error',
    )) {
        panel.hidden = false;
    }
    reset();
    document.querySelector('.playground__fallback').hidden = true;
}
