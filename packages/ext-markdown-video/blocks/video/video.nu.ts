/**
 * video — an embedded player. The `video` node supplies the embed URL, the
 * provider name and the page language; the frame title is Russian for `ru`
 * and English otherwise.
 */
import { block } from '@nuckty/core';

function title(provider: unknown, lang: unknown): string {
    const name = typeof provider === 'string' ? provider : '';

    return lang === 'ru' ? `Видео ${name}` : `${name} video`;
}

export default function templates(): void {
    block('video')({
        tag: 'div',
        content: (node) => ({ block: 'video', elem: 'frame', props: node.props ?? {} }),
    });
    block('video').elem('frame')({
        tag: 'iframe',
        attrs: (node, next) => ({
            ...next(),
            ...(typeof node.props?.['src'] === 'string' ? { src: node.props['src'] } : {}),
            title: title(node.props?.['provider'], node.props?.['lang']),
            loading: 'lazy',
            allowfullscreen: true,
        }),
    });
}
