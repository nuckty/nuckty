// These pure engine modules are bundled into the static demo by nuckty's JS stage.
import { Templates } from 'nuckty/src/bem/templates.ts';
import { render } from 'nuckty/src/bem/render.ts';

const ru = document.documentElement.lang === 'ru';
const input = document.querySelector('#playground-input');

if (input) {
    const templates = new Templates();
    templates.add({ block: 'card', modes: { tag: 'article' } });
    templates.add({ block: 'card', elem: 'title', modes: { tag: 'h2' } });
    templates.add({ block: 'card', elem: 'description', modes: { tag: 'p' } });
    templates.add({ block: 'button', modes: { tag: 'button', attrs: (_node, next) => ({ ...next(), type: 'button' }) } });
    templates.add({ block: 'button', modName: 'disabled', modes: { attrs: (_node, next) => ({ ...next(), disabled: true }) } });
    const presets = {
        card: { block: 'card', content: [
            { elem: 'title', content: 'Hello, nuckty' },
            { elem: 'description', content: (ru ? 'Текст меняется вместе с HTML.' : 'The text changes with the HTML.') },
        ] },
        list: { tag: 'ul', tightList: true, content: ['Markdown', 'BEMJSON', 'HTML'].map((content) => ({ tag: 'li', content })) },
        button: { block: 'button', mods: { disabled: true }, content: (ru ? 'Кнопка с модификатором' : 'Button with a modifier') },
        escaping: { tag: 'p', content: (ru ? '<script>alert("Это просто текст")</script> & nuckty' : '<script>alert("Just text")</script> & nuckty') },
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
            frame.srcdoc = `<!doctype html><html lang="${ru ? 'ru' : 'en'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:14px;font:clamp(13px,calc(11px + 1vw),16px)/1.6 "Helvetica Neue",system-ui;background:#fffef9;color:#272822}.card{padding:14px;border:1px solid #dedfd5;max-width:450px}.card__title{margin:0 0 7px;font-size:clamp(21px,calc(17px + 1.4vw),27px);letter-spacing:-1px}.card__description{margin:0;color:#606860}.card_color_orange{background:#fff1e5;border-color:#c44525}button{padding:12px 20px;background:#b5472d;color:white;border:0}button:disabled{opacity:.5}pre{white-space:pre-wrap}</style><body>${html}`;
            error.textContent = '';
            input.removeAttribute('aria-invalid');
            status.textContent = `${new TextEncoder().encode(html).length} ${ru ? 'байт HTML' : 'bytes of HTML'}`;
            copyButton.disabled = false;
        } catch (reason) {
            error.textContent = `${ru ? 'Не удалось собрать пример' : 'Could not render the example'}: ${reason.message}`;
            input.setAttribute('aria-invalid', 'true');
            status.textContent = (ru ? 'Проверьте JSON' : 'Check the JSON');
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
            copyButton.textContent = (ru ? 'Скопировано' : 'Copied');
        } catch {
            copyButton.textContent = (ru ? 'Выделите HTML' : 'Select HTML');
        }

        setTimeout(() => { copyButton.textContent = (ru ? 'Копировать HTML' : 'Copy HTML'); }, 1600);
    });
    for (const panel of document.querySelectorAll('.playground__toolbar, .playground__columns, .playground__preview-pane, .playground__error')) {
        panel.hidden = false;
    }
    reset();
    document.querySelector('.playground__fallback').hidden = true;
}
