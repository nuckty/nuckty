/**
 * lightbox — the full-size view of the gallery: a modal dialog with a close
 * control. The gallery script fills it with the selected image. `props.lang`
 * selects the labels; languages other than Russian use English.
 */
import { block } from '@nuckty/core';

const LABELS = {
    en: { viewer: 'Image viewer', close: 'Close image' },
    ru: { viewer: 'Просмотр изображения', close: 'Закрыть изображение' },
};

function labels(lang: unknown): (typeof LABELS)['en'] {
    return lang === 'ru' ? LABELS.ru : LABELS.en;
}

export default function templates(): void {
    block('lightbox')({
        tag: 'dialog',
        attrs: (node, next) => ({ ...next(), 'aria-label': labels(node.props?.['lang']).viewer }),
        content: (node) => ({ block: 'lightbox', elem: 'close', props: node.props ?? {} }),
    });
    block('lightbox').elem('close')({
        tag: 'button',
        attrs: (node, next) => ({ ...next(), type: 'button', autofocus: true, 'aria-label': labels(node.props?.['lang']).close }),
        content: '×',
    });
}
