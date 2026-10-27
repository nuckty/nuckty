# Block-расширение

Block-расширение поставляет набор БЭМ-блоков — один или несколько файлов `.nu.ts` плюс, по желанию, CSS и JS. Точка входа — `env.levels`: расширение добавляет свой каталог `blocks/` как [уровень](../blocks/levels.ru.md), и движок загружает блоки из него по [зависимостям](../blocks/deps.ru.md).

## Принцип

Движок заранее не знает, какие блоки существуют. Уровни указывают каталоги, в которых движок ищет блоки. Block-расширение добавляет свой уровень:

```
config/levels.json:        ["content", "blocks"]              уровни сайта
env.levels.add(...)        @nuckty/ext-block-gallery/blocks/    уровень расширения
```

Когда блок `gallery` указан в зависимостях бандла, движок ищет `gallery.nu.ts` по всем уровням (включая уровень расширения) и выбирает файл с самого позднего совпавшего уровня. Подробнее — [уровни](../blocks/levels.ru.md) и [зависимости](../blocks/deps.ru.md).

## API

```ts
interface NucktyEnv {
    levels: {
        add(dir: string): void;
    };
}
```

```ts
// внутри register(env) расширения
import { fileURLToPath } from 'node:url';
import type { NucktyEnv } from '@nuckty/core';

export function register(env: NucktyEnv): void {
    env.levels.add(fileURLToPath(new URL('../blocks/', import.meta.url)));
}
```

Расширение не регистрирует каждый блок по имени: оно кладёт файлы `.nu.ts` в `blocks/` и добавляет каталог как уровень. Остальное — загрузку по зависимостям — движок делает сам.

## Структура расширения

```
@nuckty/ext-block-gallery/
  blocks/
    gallery/
      gallery.nu.ts          шаблон блока
      gallery.css            стили
      gallery.js             скрипты (лайтбокс)
  src/index.ts               register(env)
  package.json
  AGENTS.md                  подключает nuckty-codestyle
```

Каталог `blocks/` расширения повторяет структуру блоков сайта. Блок `gallery` лежит в `blocks/gallery/gallery.nu.ts`, как и любой блок.

## Переопределение и композиция

Движок загружает уровни расширений первыми, а настроенные уровни сайта добавляет после них, поэтому блок можно переопределить: положите свою версию `blocks/gallery/gallery.nu.ts` на более поздний уровень, и движок выберет её. Подробнее — [уровни](../blocks/levels.ru.md).

## Один пакет — несколько блоков

Расширение может поставлять несколько связанных блоков. Например, набор компонентов добавляет `button`, `input`, `card`, `modal`: один `register(env)` регистрирует общий каталог как уровень. Набор загружаемых блоков определяет декларация зависимостей бандла.

## Связь с markdown-расширением

Конструкция markdown-разметки (`:::gallery`) раскрывается в блок (`gallery`). Поэтому markdown-расширение с синтаксисом и block-расширение с блоком часто объединяют в одном пакете — синтаксис и реализация рядом. Подробнее — [markdown-расширение](markdown.ru.md).

## Каталог block-расширений

Готовые block-расширения собраны в [каталоге](../../ext/block.ru.md). Примеры: [`root`](../../ext/block/root.ru.md) ([обёртка документа](../../out/html.ru.md)), [`gallery`](../../ext/block/gallery.ru.md) (галерея с лайтбоксом).
