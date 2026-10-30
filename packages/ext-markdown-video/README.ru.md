# @nuckty/ext-markdown-video

> **Встраивание видео — конструкция `@[provider](id)`.**

Markdown-расширение для [nuckty](https://github.com/nuckty/nuckty). Встраивает видео с YouTube, RuTube или VK одной строкой разметки. Расширение не добавляет зависимости JavaScript в артефакт. Конструкция становится блоком `video` из пакета: его шаблон и CSS выводят адаптивный iframe.

## Конструкция markdown-разметки

```md
@[youtube](dQw4w9WgXcQ)
@[rutube](abc123)
```

Шаблон блока выводит плеер с заголовком по-русски на таргетах `ru` и по-английски на остальных:

```html
<div class=video><iframe class=video__frame src=https://www.youtube.com/embed/dQw4w9WgXcQ title="YouTube video" loading=lazy allowfullscreen></iframe></div>
```

Провайдеры: `youtube`, `rutube`, `vk` — регистр не важен. Незнакомый провайдер остаётся обычным текстом со ссылкой.

## Свои провайдеры

Пакет экспортирует `createVideoExtension` и `DEFAULT_VIDEO_PROVIDERS`. Свой провайдер задаётся именем, подписью и функцией, которая строит URL:

```ts
import { createVideoExtension, DEFAULT_VIDEO_PROVIDERS } from '@nuckty/ext-markdown-video';

export const register = createVideoExtension([
    ...DEFAULT_VIDEO_PROVIDERS,
    { name: 'vimeo', label: 'Vimeo', src: (id) => `https://player.vimeo.com/video/${id}` },
]);
```

Сохраните модуль как `ext/video.ts` и укажите `./ext/video.ts` в `ext` вместо `@nuckty/ext-markdown-video`. Использование обоих одновременно повторно зарегистрирует преобразование. Для VK доступны идентификатор `-123_456` и полный адрес HTTPS `video_ext.php` на vk.com, vk.ru или vkvideo.ru; некорректный аргумент VK вызывает ошибку. Встроенный iframe может загружать код стороннего плеера; само расширение не добавляет бандл JS.

## Как подключить

```bash
npm install @nuckty/ext-markdown-video
```

Пример продолжает быстрый старт со стандартным обработчиком `@nuckty/ext-block-root`. Добавьте новое расширение в `ext` глобального `config/config-nuckty.ts`, сохранив остальные записи. Если обработчик документа собственный, оставьте его вместо `@nuckty/ext-block-root`.

```ts
import { defineNucktyConfig } from '@nuckty/core';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['@nuckty/ext-block-root', '@nuckty/ext-markdown-video'],
});
```

После этого конструкция `@[provider](id)` работает в любом `.md`. Добавьте `video` в bemdecl бандла; при необходимости переопределите блок на более позднем уровне.

## Контракт

`register(env: NucktyEnv)` подключает remark-плагин через `env.markdown.use`, отображает узлы `video` через `env.markdown.node` и добавляет `blocks/` через `env.levels`.

## Спецификация

Поведение закреплено в спецификации openspec `ext-markdown-video` (`openspec/specs/ext-markdown-video/spec.md`).

## Лицензия

MIT.
