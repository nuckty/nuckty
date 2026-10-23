# nu — шаблонизатор nuckty

nu преобразует типизированное дерево BEMJSON в HTML. Контент Markdown и блоки документа используют один движок. Канонические руководства описывают [модель данных](https://github.com/nuckty/nuckty-docs/blob/main/how/bemjson.ru.md), [шаблоны](https://github.com/nuckty/nuckty-docs/blob/main/how/templates.ru.md) и [HTML на выходе](https://github.com/nuckty/nuckty-docs/blob/main/out/html.ru.md).

## Модуль блока

Файл шаблона экспортирует функцию по умолчанию. Загрузчик вызывает её в текущей коллекции `Templates`; вызов `block()` вне этого контекста приводит к ошибке.

```ts
// blocks/menu/menu.nu.ts
import { block } from 'nuckty';

export default function templates(): void {
    block('menu')({ tag: 'ul' });
    block('menu').elem('item')({ tag: 'li' });
    block<{ trackId?: string }>('menu')({
        attrs: (node, next) => ({
            ...next(),
            'data-track': node.props?.trackId ?? '',
        }),
    });
}
```

Добавьте `menu` в `blocks/<bundle>/<bundle>.bemdecl.js`, а имя бандла — в `config/site.json`. Декларация читается как CommonJS; в потребителе с ESM можно задать `{"type":"commonjs"}` в `blocks/package.json`. Декларация содержит плоский список блоков; движок не определяет его по содержимому страниц.

## Публичные типы данных

`BemNode` описывает блок, элемент, модификаторы, тег, атрибуты и содержимое узла. Точный рекурсивный тип:

```ts
import type { BemNode } from 'nuckty';
type BEMTree = BemNode | BEMTree[] | string | null | undefined | false;
```

Само поле `props` не сериализуется в HTML; шаблоны могут вывести его значения через содержимое или атрибуты. `raw` вставляет доверенную строку без экранирования и минимизации. Массивы могут быть вложенными; пустые позиции ничего не выводят.

## Режимы и приоритет

Режимы отображения (`tag`, `content`, `attrs`, `mods`, `elemMods`, `mix`, `cls`, `js`, `bem`) задают поля. Управляющие режимы (`replace`, `wrap`, `def`) меняют дерево. Все режимы применяются до сериализации.

В режимах отображения и `content` вызов `next()` вычисляет менее специфичную декларацию или возвращает исходное поле в конце цепочки. Объединяйте результаты явно, как в `...next()` выше. В `replace`, `wrap` и `def` он возвращает весь узел с уже применёнными режимами, а не вызывает предыдущий управляющий режим.

Специфичность складывается из весов видов селекторов: именованный блок — 1, именованный элемент — 2, модификатор блока — 4, модификатор элемента — 8, предикат — 16. Имена блока и элемента `*` добавляют 0. При равенстве выбирается поздняя декларация. `.when()` принимает булев предикат.

По уровням загружается только последний найденный файл `.nu.ts` блока. Для сохранения базовых деклараций явно вызовите их функцию регистрации в своём `templates()`; `next()` не загружает предыдущий файл.

## Отдельный рендеринг

```ts
import { block, Templates, runWithTemplates, render } from 'nuckty';

const templates = new Templates();
runWithTemplates(templates, () => block('greeting')({ tag: 'p' }));
const tree = { block: 'greeting', content: 'Hello' };
const html = render(tree, { templates });
const resolved = render(tree, { templates, output: 'bemjson' });
```

По умолчанию `render` возвращает фрагмент HTML. `document: true` добавляет `<!doctype html>` и два перевода строки в конце. Внутренние этапы применения шаблонов и сериализации не экспортируются отдельно из корня пакета.

Сериализатор экранирует текст и атрибуты, опускает поддерживаемые необязательные закрывающие теги, сохраняет `raw` и комментарии HTML и закрывает `p`. Полный артефакт проверяет отдельная команда `nuckty validate` из расширения валидатора.
