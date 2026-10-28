# @nuckty/ext-markdown-video

Embedding videos from video hosting platforms (YouTube, RuTube, VK) in Markdown via the `@[provider](id)` construct. The package adds only that: no block, no external JS libraries.

## Type

[markdown](../../how/ext/markdown.md) — registers a remark plugin via `env.markdown.use(...)`. It supplies no block: the plugin builds the player markup itself.

## Markdown construct

A video is inserted in a single line — the provider name in square brackets, the identifier in parentheses:

```md
@[youtube](dQw4w9WgXcQ)
@[rutube](abc123)
```

The plugin finds the construct and replaces it with ready-made player markup:

```html
<div class=video><iframe class=video__iframe src=https://www.youtube.com/embed/dQw4w9WgXcQ title="youtube video" loading=lazy allowfullscreen></iframe></div>
```

Providers: `youtube`, `rutube`, `vk` — case does not matter. An unknown provider stays plain text with a link.

## Behavior

- **No external libraries** — the iframe markup is static; the extension adds no JavaScript libraries to the artifact.
- **Styles live on the site** — the `video` and `video__iframe` classes are styled by your own CSS layer through [dependencies](../../how/blocks/deps.md).

## Custom providers

The provider list is extensible: the package exports `createVideoPlugin` and `DEFAULT_VIDEO_PROVIDERS`. A custom provider has a name and a function that builds its URL:

```ts
import { createVideoPlugin, DEFAULT_VIDEO_PROVIDERS } from '@nuckty/ext-markdown-video';

import type { NucktyEnv } from '@nuckty/core';

export function register(env: NucktyEnv): void {
    env.markdown.use(createVideoPlugin([
        ...DEFAULT_VIDEO_PROVIDERS,
        { name: 'vimeo', src: (id) => `https://player.vimeo.com/video/${id}` },
    ]) as Parameters<typeof env.markdown.use>[0]);
}
```

Save this module as `ext/video.ts` and load `./ext/video.ts` instead of the standard package in `ext`. For VK, use an identifier such as `-123_456` or a full HTTPS `video_ext.php` URL on vk.com, vk.ru, or vkvideo.ru. An invalid VK argument causes an error. The extension adds no JavaScript bundle, but an iframe may load player scripts.

## Installation

This example extends the quickstart with the standard `@nuckty/ext-block-root` document handler. Add the new extension to `ext` in the global `config/config-nuckty.ts`, retaining the other entries. If you use a custom document handler, keep its registration instead of `@nuckty/ext-block-root`.

Install the extension from npm in the extracted [starter project](../../how/start.md):

```
npm install --save-exact @nuckty/ext-markdown-video@1.0.0-rc.0
```

```ts
import { defineNucktyConfig } from '@nuckty/core';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['@nuckty/ext-block-root', '@nuckty/ext-markdown-video'],
});
```

After that, the `@[provider](id)` construct works in any `.md`.
