/**
 * @nuckty/ext-markdown-video — video embed via `@[provider](id)`.
 *
 * `register(env)` adds the remark plugin that turns `@[provider](id)` into
 * `video` mdast nodes (openspec `ext-markdown-video`), maps those nodes to the
 * `video` block and adds the package's `blocks/` level with its template and CSS.
 * Default providers: YouTube, RuTube, VK. Without the extension,
 * `@[youtube](id)` renders as ordinary text and a link.
 *
 * @module @nuckty/ext-markdown-video
 */

import { fileURLToPath } from 'node:url';
import type { MarkdownNodeHandler, NucktyEnv } from '@nuckty/core';
import { createVideoPlugin, DEFAULT_VIDEO_PROVIDERS, type VideoProvider } from './video-plugin.js';

export { remarkVideoEmbed, createVideoPlugin, DEFAULT_VIDEO_PROVIDERS } from './video-plugin.js';
export type { VideoNode, VideoProvider } from './video-plugin.js';

/** Map a `video` node to the `video` block with its embed URL, provider and page language. */
export const videoHandler: MarkdownNodeHandler = (node, env) => ({
    block: 'video',
    props: { src: node['src'], provider: node['provider'], lang: env.lang },
});

/** Create a `register(env)` for a provider list; the default export uses the default providers. */
export function createVideoExtension(providers: VideoProvider[] = DEFAULT_VIDEO_PROVIDERS): (env: NucktyEnv) => void {
    return (env) => {
        env.levels.add(fileURLToPath(new URL('../blocks/', import.meta.url)));
        env.markdown.use(createVideoPlugin(providers));
        env.markdown.node('video', videoHandler);
    };
}

export const register = createVideoExtension();

export default register;
