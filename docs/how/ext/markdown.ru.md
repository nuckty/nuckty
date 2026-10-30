# Markdown-расширение

Markdown-расширение добавляет [конструкции markdown-разметки](../markdown.ru.md) через `env.markdown`. Оно регистрирует обработчик директивы, обработчик типа узла mdast или remark-плагин, который преобразует mdast до перехода в [BEMJSON](../bemjson.ru.md).

## Директивы

| Вид | Синтаксис |
|---|---|
| Текстовая | `:name[label]{attrs}` |
| Блочная | `::name[label]{attrs}` |
| Контейнер | `:::name{attrs}` … `:::` |

Пишите имя без пробела после двоеточий. Для совместимости движок также нормализует простой вариант `::: gallery` в начале строки без атрибутов; это не общее правило для всех директив с пробелами.

Неизвестная директива раскрывается в обычное содержимое. Атрибуты доступны как `node.attributes`, дочерние узлы mdast — как `node.children` с типом `unknown[]`.

## API и пример

`env.markdown.directive(name, handler)` принимает `DirectiveHandler`: `(node: DirectiveNode, env: MarkdownOptions, convert: DirectiveConverters) => BEMTree | null`. `node.type` — форма директивы: `containerDirective`, `leafDirective` или `textDirective`. Второй аргумент — параметры Markdown страницы: карта изображений, исходный файл и язык таргета `lang`. `convert.inline(children)` и `convert.blocks(children)` преобразуют дочерние узлы директивы в BEMJSON так же, как страница преобразует обычный Markdown, с разрешением ссылок и изображений. `null` включает обычное преобразование содержимого.

В примере обработчик намеренно сводит текст к строке; оформление и ссылки не сохраняются. Для сложного содержимого реализуйте собственное преобразование узлов.

```ts
import type { NucktyEnv } from '@nuckty/core';

interface TextNode {
    type?: string;
    value?: string;
    children?: TextNode[];
}

function text(nodes: TextNode[]): string {
    return nodes.map((node) => node.type === 'text' || node.type === 'inlineCode'
        ? node.value ?? ''
        : text(node.children ?? [])).join('');
}

export function register(env: NucktyEnv): void {
    env.markdown.directive('callout', (node) => ({
        block: 'callout',
        mods: { type: node.attributes?.class ?? 'note' },
        content: text((node.children ?? []) as TextNode[]),
    }));
    env.markdown.directive('badge', (node) => ({
        block: 'badge',
        mods: { type: node.attributes?.type ?? 'new' },
        content: text((node.children ?? []) as TextNode[]),
    }));
}
```

Используйте `:::callout{.warning}` с абзацем внутри или `::badge[1.2]{type=new}`. Добавьте `callout` и `badge` в [bemdecl](../blocks/deps.ru.md) и предоставьте их [шаблоны](../templates.ru.md) и стили на [уровнях](../blocks/levels.ru.md). Само появление узла не добавляет блок в декларацию.

`env.markdown.node(type, handler)` превращает каждый узел mdast типа `type` в BEMJSON до того, как ядро преобразует этот тип; у обработчика те же аргументы, что у обработчика директивы, а `null` оставляет преобразование ядра. remark-плагин может вставить узлы собственного типа для такого обработчика. Обработчики возвращают узлы блоков, а не строки HTML: разметку дают шаблоны блока.

`env.markdown.use(plugin)` принимает remark-плагин для произвольного преобразования mdast. Например, [видео](../../ext/markdown/video.ru.md) превращает ссылки `@[provider](id)` в узлы `video`. Директивы галереи и сетки совмещают markdown- и block-расширение в одном пакете; готовые реализации перечислены в [каталоге](../../ext/markdown.ru.md).
