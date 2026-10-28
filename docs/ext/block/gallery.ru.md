# @nuckty/ext-block-gallery

Галерея изображений с лайтбоксом. Пакет объединяет блок `gallery` и конструкцию markdown-разметки `:::gallery`: синтаксис и реализация галереи поставляются вместе.

## Типы

Пакет совмещает два типа расширений через единый `register(env)`:

- [block](../../how/ext/block.ru.md) — блок `gallery` (и вспомогательный `lightbox`) через `env.levels`.
- [markdown](../../how/ext/markdown.ru.md) — конструкция `:::gallery` через `env.markdown`.

## Конструкция markdown-разметки

Автор пишет:

```md
:::gallery
![Подпись A](a.png)
![Подпись B](b.png)
![Подпись C](c.png)
:::
```

Markdown-расширение находит узел-контейнер и превращает его в [BEMJSON](../../how/bemjson.ru.md) блока `gallery` со списком изображений. Для каждого изображения движок подставляет хэшированное имя из `image-mapping.json` (см. [изображения](../../out/images.ru.md)).

## Поведение

- **Сетка** — CSS блока располагает изображения адаптивной сеткой.
- **Лайтбокс** — клик по изображению открывает полноразмерную версию (блок `lightbox`). Реализация собственная, без внешних зависимостей JS вроде tobii: движок не подключает фронтенд-библиотеки.
- **Отложенная загрузка** — у первого изображения каждой галереи нет `loading=lazy`, у остальных атрибут есть. Это не определяет, видно ли изображение без прокрутки.

## Установка

Пример продолжает быстрый старт со стандартным обработчиком `@nuckty/ext-block-root`. Добавьте новое расширение в `ext` глобального `config/config-nuckty.ts`, сохранив остальные записи. Если обработчик документа собственный, оставьте его вместо `@nuckty/ext-block-root`.

Установите расширение из npm в распакованном [стартовом проекте](../../how/start.ru.md):

```
npm install --save-exact @nuckty/ext-block-gallery@1.0.0-rc.0
```

```ts
import { defineNucktyConfig } from '@nuckty/core';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['@nuckty/ext-block-root', '@nuckty/ext-block-gallery'],
});
```

После этого конструкция `:::gallery` работает в любом `.md`, а блоки `gallery` и `lightbox` добавьте в bemdecl бандла — стили и скрипт попадут в сборку по [зависимостям](../../how/blocks/deps.ru.md).

## Переопределение

Поместите свой `blocks/gallery/gallery.nu.ts` на поздний [уровень](../../how/blocks/levels.ru.md) для замены [шаблона](../../how/templates.ru.md). Для стилей добавьте `blocks/gallery/gallery.css` на этот уровень: CSS объявленного блока объединяется со всех уровней. В [bemdecl](../../how/blocks/deps.ru.md) перечисляются имена блоков.
