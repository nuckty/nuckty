# nuckty-ext-markdown-video

Встраивание видео с видеохостингов (YouTube, RuTube, VK) в Markdown — конструкцией `@[provider](id)`. Пакет добавляет только её: ни блока, ни внешних библиотек JS.

## Тип

[markdown](../../how/ext/markdown.ru.md) — регистрирует remark-плагин через `env.markdown.use(...)`. Блока не поставляет: разметку плеера плагин строит сам.

## Конструкция markdown-разметки

Видео вставляют одной строкой — имя провайдера в квадратных скобках, идентификатор — в круглых:

```md
@[youtube](dQw4w9WgXcQ)
@[rutube](abc123)
```

Плагин находит конструкцию и заменяет её готовой разметкой плеера:

```html
<div class=video><iframe class=video__iframe src=https://www.youtube.com/embed/dQw4w9WgXcQ title="youtube video" loading=lazy allowfullscreen></iframe></div>
```

Провайдеры: `youtube`, `rutube`, `vk` — регистр не важен. Незнакомый провайдер остаётся обычным текстом со ссылкой.

## Поведение

- **Без внешних библиотек** — разметка iframe статична, расширение не добавляет в артефакт библиотеки JS.
- **Стили — на сайте** — добавьте стили для классов `video` и `video__iframe` в свой CSS через механизм [зависимостей](../../how/blocks/deps.ru.md).

## Свои провайдеры

Список провайдеров расширяется: пакет экспортирует `createVideoPlugin` и `DEFAULT_VIDEO_PROVIDERS`. Свой провайдер задаётся именем и функцией, которая строит URL:

```ts
import { createVideoPlugin, DEFAULT_VIDEO_PROVIDERS } from 'nuckty-ext-markdown-video';

import type { NucktyEnv } from 'nuckty';

export function register(env: NucktyEnv): void {
    env.markdown.use(createVideoPlugin([
        ...DEFAULT_VIDEO_PROVIDERS,
        { name: 'vimeo', src: (id) => `https://player.vimeo.com/video/${id}` },
    ]) as Parameters<typeof env.markdown.use>[0]);
}
```

Сохраните этот модуль в `ext/video.ts` и подключите `./ext/video.ts` вместо стандартного пакета в поле `ext`. Для VK используйте идентификатор вида `-123_456` или полный адрес HTTPS `video_ext.php` на vk.com, vk.ru или vkvideo.ru. Неверный аргумент VK вызывает ошибку. Само расширение не добавляет бандл JS, но iframe может загружать код плеера.

## Установка

Пример продолжает быстрый старт со стандартным обработчиком `nuckty-ext-block-root`. Добавьте новое расширение в `ext` глобального `config/config-nuckty.ts`, сохранив остальные записи. Если обработчик документа собственный, оставьте его вместо `nuckty-ext-block-root`.

Команда ниже выполняется из распакованного [стартового проекта](../../how/start.ru.md): готовые архивы расширений находятся в `packages/`.

```
npm install ./packages/nuckty-ext-markdown-video-1.0.0-beta1.tgz
```

```ts
import { defineNucktyConfig } from 'nuckty';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['nuckty-ext-block-root', 'nuckty-ext-markdown-video'],
});
```

После этого конструкция `@[provider](id)` работает в любом `.md`.

