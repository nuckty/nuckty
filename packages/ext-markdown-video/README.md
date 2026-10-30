# @nuckty/ext-markdown-video

> **Video embedding — the `@[provider](id)` construct.**

A Markdown extension for [nuckty](https://github.com/nuckty/nuckty). It embeds a video from YouTube, RuTube, or VK in a single line and pulls no JS dependency into the artifact. The construct becomes the package's `video` block, whose template and CSS render a responsive iframe.

## The markdown construct

```md
@[youtube](dQw4w9WgXcQ)
@[rutube](abc123)
```

The block template renders the player, titled in Russian on `ru` targets and in English otherwise:

```html
<div class=video><iframe class=video__frame src=https://www.youtube.com/embed/dQw4w9WgXcQ title="YouTube video" loading=lazy allowfullscreen></iframe></div>
```

Providers: `youtube`, `rutube`, `vk` — case does not matter. An unknown provider stays plain text with a link.

## Custom providers

The package exports `createVideoExtension` and `DEFAULT_VIDEO_PROVIDERS`. A custom provider has a name, a display label and a function that builds its URL:

```ts
import { createVideoExtension, DEFAULT_VIDEO_PROVIDERS } from '@nuckty/ext-markdown-video';

export const register = createVideoExtension([
    ...DEFAULT_VIDEO_PROVIDERS,
    { name: 'vimeo', label: 'Vimeo', src: (id) => `https://player.vimeo.com/video/${id}` },
]);
```

Save the module as `ext/video.ts` and list `./ext/video.ts` in `ext` instead of `@nuckty/ext-markdown-video`. Listing both registers the transform twice. VK accepts an identifier such as `-123_456` or a full HTTPS `video_ext.php` URL on vk.com, vk.ru, or vkvideo.ru; an invalid VK argument causes an error. An iframe may load the provider's player scripts; the extension itself adds no JavaScript bundle.

## How to load

```bash
npm install @nuckty/ext-markdown-video
```

This example extends the quickstart with the standard `@nuckty/ext-block-root` document handler. Add the new extension to `ext` in the global `config/config-nuckty.ts`, retaining the other entries. If you use a custom document handler, keep its registration instead of `@nuckty/ext-block-root`.

```ts
import { defineNucktyConfig } from '@nuckty/core';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['@nuckty/ext-block-root', '@nuckty/ext-markdown-video'],
});
```

After that the `@[provider](id)` construct works in any `.md`. Add `video` to the bundle's bemdecl; override the block on a later level if needed.

## Contract

`register(env: NucktyEnv)` installs the remark plugin through `env.markdown.use`, maps `video` nodes with `env.markdown.node` and adds `blocks/` through `env.levels`.

## Spec

Behavior is fixed by the openspec `ext-markdown-video` spec (`openspec/specs/ext-markdown-video/spec.md`).

## License

MIT.
