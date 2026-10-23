import { block } from 'nuckty';

export default function templates(): void {
    block<{ lang?: string }>('lightbox')({
        tag: 'dialog',
        attrs: (node, next) => ({ ...next(), 'aria-label': node.props?.lang === 'en' ? 'Image viewer' : 'Просмотр изображения' }),
    });
    block<{ lang?: string }>('lightbox').elem('image')({ tag: 'img' });
    block<{ lang?: string }>('lightbox').elem('close')({
        tag: 'button',
        attrs: (node, next) => ({ ...next(), 'aria-label': node.props?.lang === 'en' ? 'Close image' : 'Закрыть изображение' }),
    });
}

