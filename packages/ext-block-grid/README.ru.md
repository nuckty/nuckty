# nuckty-ext-block-grid

> **Многоколоночная раскладка контента — конструкция `:::grid` и блок `grid`.**

Пакет для [nuckty](https://github.com/nuckty/nuckty), объединяющий два типа расширений в одном `register(env)`:

- **block** — блок `grid` через `env.levels`;
- **markdown** — конструкция `:::grid` через `env.markdown.directive`.

## Конструкция markdown-разметки

```md
:::grid
Первая колонка.

Вторая колонка.

Третья колонка.
:::
```

Обработчик превращает каждый непустой дочерний абзац в текстовую ячейку `grid__item`. Ссылки и выделение сводятся к тексту; вложенные списки, заголовки и другие узлы вместо абзацев вызывают ошибку. Пустой контейнер раскрывается в обычное содержимое.

## Поведение

- **Адаптивная сетка** — ячейки выкладываются в несколько колонок через CSS блока; число колонок подстраивается под ширину экрана.
- **Без внешних зависимостей** — раскладка держится на CSS блока, без сторонних библиотек CSS и JS.

## Как подключить

```bash
npm install nuckty-ext-block-grid
```

Пример продолжает быстрый старт со стандартным обработчиком `nuckty-ext-block-root`. Добавьте новое расширение в `ext` глобального `config/config-nuckty.ts`, сохранив остальные записи. Если обработчик документа собственный, оставьте его вместо `nuckty-ext-block-root`.

```ts
import { defineNucktyConfig } from 'nuckty';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['nuckty-ext-block-root', 'nuckty-ext-block-grid'],
});
```

И добавьте `grid` в bemdecl бандла страницы, например `blocks/page/page.bemdecl.js`.

## Переопределение

Для замены шаблона добавьте `blocks/grid/grid.nu.ts` на позднем уровне. Для изменения стилей добавьте `blocks/grid/grid.css` на этом уровне: CSS объединяется со всех уровней. В bemdecl указывают имя `grid`, а не пути файлов CSS.

## Спецификация

Поведение закреплено в спецификации openspec `ext-block-grid` (`openspec/specs/ext-block-grid/spec.md`).

## Лицензия

MIT.

