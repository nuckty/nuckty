# @nuckty/ext-markdown-video

Встраивание видео с видеохостингов (YouTube, RuTube, VK) в Markdown — конструкцией `@[provider](id)`. Пакет поставляет конструкцию вместе с блоком `video` и без внешних библиотек JS.

## Тип

[markdown](../../how/ext/markdown.ru.md) и [block](../../how/ext/block.ru.md) — remark-плагин через `env.markdown.use(...)` превращает конструкцию в узлы `video`, `env.markdown.node('video', ...)` отображает их на блок `video`, а `env.levels` добавляет шаблон и CSS блока.

## Конструкция markdown-разметки

Видео вставляют одной строкой — имя провайдера в квадратных скобках, идентификатор — в круглых:

```md
@[youtube](dQw4w9WgXcQ)
@[rutube](abc123)
```

Конструкция становится блоком `video` между абзацами; его шаблон выводит плеер с заголовком по-русски на таргетах `ru` и по-английски на остальных:

```html
<div class=video><iframe class=video__frame src=https://www.youtube.com/embed/dQw4w9WgXcQ title="YouTube video" loading=lazy allowfullscreen></iframe></div>
```

Провайдеры: `youtube`, `rutube`, `vk` — регистр не важен. Незнакомый провайдер остаётся обычным текстом со ссылкой.

## Поведение

- **Без внешних библиотек** — разметка iframe статична, расширение не добавляет в артефакт библиотеки JS.
- **Блок со стилями** — добавьте `video` в [bemdecl](../../how/blocks/deps.ru.md), чтобы подключить шаблон и адаптивный CSS 16:9; более поздний уровень может переопределить любой из них.

## Свои провайдеры

Список провайдеров расширяется: пакет экспортирует `createVideoExtension` и `DEFAULT_VIDEO_PROVIDERS`. Свой провайдер задаётся именем, подписью для заголовка плеера и функцией, которая строит URL:

```ts
import { createVideoExtension, DEFAULT_VIDEO_PROVIDERS } from '@nuckty/ext-markdown-video';

export const register = createVideoExtension([
    ...DEFAULT_VIDEO_PROVIDERS,
    { name: 'vimeo', label: 'Vimeo', src: (id) => `https://player.vimeo.com/video/${id}` },
]);
```

Сохраните этот модуль в `ext/video.ts` и подключите `./ext/video.ts` вместо стандартного пакета в поле `ext`. Для VK используйте идентификатор вида `-123_456` или полный адрес HTTPS `video_ext.php` на vk.com, vk.ru или vkvideo.ru. Неверный аргумент VK вызывает ошибку. Само расширение не добавляет бандл JS, но iframe может загружать код плеера.

## Установка

Пример продолжает быстрый старт со стандартным обработчиком `@nuckty/ext-block-root`. Добавьте новое расширение в `ext` глобального `config/config-nuckty.ts`, сохранив остальные записи. Если обработчик документа собственный, оставьте его вместо `@nuckty/ext-block-root`.

Установите расширение из npm в распакованном [стартовом проекте](../../how/start.ru.md):

```bash
npm install --save-exact @nuckty/ext-markdown-video@1.0.0-rc.5
```

```ts
import { defineNucktyConfig } from '@nuckty/core';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['@nuckty/ext-block-root', '@nuckty/ext-markdown-video'],
});
```

После этого конструкция `@[provider](id)` работает в любом `.md`; добавьте `video` в bemdecl бандла.
