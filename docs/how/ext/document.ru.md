# Расширение документа

Обработчик документа преобразует подготовленные движком данные в [BEMTree](../bemjson.ru.md). Он задаёт [обёртку документа HTML](../../out/html.ru.md) и размещает контент. Для сборки нужен ровно один обработчик: отсутствие или повторная регистрация вызывает ошибку.

## API

`env.document.register(handler)` принимает функцию `(data: DocumentData) => BEMTree | Promise<BEMTree>`. В данных есть `page`, `content`, `sitemap`, `assets`, `alternates`, необязательные `target` и `lang`. Настройки сайта доступны через `target?.data`. `page.lastUpdated` — время последнего коммита исходника страницы в секундах Unix или `null`; форматирует его шаблон.

`data.content` — дерево контента страницы (`data.page.tree`). Поместите его в документ: движок собирает документ вместе с контентом, поэтому все [шаблоны](../templates.ru.md) применяются к обоим.

## Минимальный обработчик

```ts
// ext/document.ts
import type { NucktyEnv } from '@nuckty/core';

export function register(env: NucktyEnv): void {
    env.document.register((data) => ({
        tag: 'html', bem: false, attrs: { lang: data.lang ?? 'en' },
        content: [
            { tag: 'head', content: [
                { tag: 'meta', attrs: { charset: 'utf-8' } },
                { tag: 'title', content: data.page.title },
            ] },
            { tag: 'body', content: data.content },
        ],
    }));
}
```

Укажите `./ext/document.ts` в поле `ext` глобального `config/config-nuckty.ts`. Этот пример не загружает CSS, JS и hreflang: добавьте их при необходимости или используйте [стандартный root](../../ext/block/root.ru.md). Собственный обработчик подключают вместо расширения root, чтобы не регистрировать два обработчика.

Ядро не выбирает блок по `page.layout`. Обработчик или шаблоны сайта сами используют эту метаинформацию. В отличие от минимального примера, root использует [декларацию блоков](../blocks/deps.ru.md).
