# Расширение документа

Обработчик документа преобразует подготовленные движком данные в [BEMTree](../bemjson.ru.md). Он задаёт [обёртку документа HTML](../../out/html.ru.md) и размещает контент. Для сборки нужен ровно один обработчик: отсутствие или повторная регистрация вызывает ошибку.

## API

`env.document.register(handler)` принимает функцию `(data: DocumentData) => BEMTree | Promise<BEMTree>`. В данных есть `page`, `content`, `sitemap`, `assets`, `alternates`, необязательные `target` и `lang`. Настройки сайта доступны через `target?.data`.

Текущая стадия HTML сначала применяет [шаблоны](../templates.ru.md) к контенту и сериализует его. Поэтому `data.content` содержит узел `raw` с готовой разметкой; исходное дерево доступно через `data.page.tree`.

## Минимальный обработчик

```ts
// ext/document.ts
import type { NucktyEnv } from 'nuckty';

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

