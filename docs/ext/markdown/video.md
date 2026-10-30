# @nuckty/ext-markdown-video

Embedding videos from video hosting platforms (YouTube, RuTube, VK) in Markdown via the `@[provider](id)` construct. The package ships the syntax together with the `video` block and no external JS libraries.

## Type

[markdown](../../how/ext/markdown.md) and [block](../../how/ext/block.md) — a remark plugin via `env.markdown.use(...)` turns the construct into `video` nodes, `env.markdown.node('video', ...)` maps them to the `video` block, and `env.levels` adds the block's template and CSS.

## Markdown construct

A video is inserted in a single line — the provider name in square brackets, the identifier in parentheses:

```md
@[youtube](dQw4w9WgXcQ)
@[rutube](abc123)
```

The construct becomes a `video` block between paragraphs; its template renders the player, titled in Russian on `ru` targets and in English otherwise:

```html
<div class=video><iframe class=video__frame src=https://www.youtube.com/embed/dQw4w9WgXcQ title="YouTube video" loading=lazy allowfullscreen></iframe></div>
```

Providers: `youtube`, `rutube`, `vk` — case does not matter. An unknown provider stays plain text with a link.

## Behavior

- **No external libraries** — the iframe markup is static; the extension adds no JavaScript libraries to the artifact.
- **Block with styles** — add `video` to the [bemdecl](../../how/blocks/deps.md) to load the template and the responsive 16:9 CSS; a later level may override either.

## Custom providers

The provider list is extensible: the package exports `createVideoExtension` and `DEFAULT_VIDEO_PROVIDERS`. A custom provider has a name, a display label for the frame title and a function that builds its URL:

```ts
import { createVideoExtension, DEFAULT_VIDEO_PROVIDERS } from '@nuckty/ext-markdown-video';

export const register = createVideoExtension([
    ...DEFAULT_VIDEO_PROVIDERS,
    { name: 'vimeo', label: 'Vimeo', src: (id) => `https://player.vimeo.com/video/${id}` },
]);
```

Save this module as `ext/video.ts` and load `./ext/video.ts` instead of the standard package in `ext`. For VK, use an identifier such as `-123_456` or a full HTTPS `video_ext.php` URL on vk.com, vk.ru, or vkvideo.ru. An invalid VK argument causes an error. The extension adds no JavaScript bundle, but an iframe may load player scripts.

## Installation

This example extends the quickstart with the standard `@nuckty/ext-block-root` document handler. Add the new extension to `ext` in the global `config/config-nuckty.ts`, retaining the other entries. If you use a custom document handler, keep its registration instead of `@nuckty/ext-block-root`.

Install the extension from npm in the extracted [starter project](../../how/start.md):

```bash
npm install --save-exact @nuckty/ext-markdown-video@1.0.0-rc.3
```

```ts
import { defineNucktyConfig } from '@nuckty/core';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['@nuckty/ext-block-root', '@nuckty/ext-markdown-video'],
});
```

After that, the `@[provider](id)` construct works in any `.md`; add `video` to the bundle's bemdecl.
