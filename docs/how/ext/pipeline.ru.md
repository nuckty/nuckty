# Pipeline-расширение

Pipeline-расширение добавляет новые стадии сборки или обвязывает существующие хуками. Точка входа — `env.pipeline`. Через него расширение меняет [конвейер](../pipeline.ru.md): строит поисковый индекс, генерирует конфигурацию [хостинга](../../out/hosting.ru.md), обрабатывает готовый артефакт.

## API

```ts
interface NucktyEnv {
    pipeline: {
        before(stage: string, fn: Stage): void;          // выполнить до стадии
        after(stage: string, fn: Stage): void;           // выполнить после стадии
        registerStage(name: string, fn: Stage, opts: { phase: Phase }): void;
    };
}
```

`Stage` — функция `(ctx: BuildContext) => void | Promise<void>`, которая работает с данными в полях [контекста сборки](../pipeline.ru.md).

Стадия может импортировать `getBuildConfig` из `nuckty` и вызвать `getBuildConfig(ctx)`, чтобы получить сохранённую конфигурацию своего таргета. Она содержит настройки `site` с учётом значений по умолчанию, упорядоченные `levels`, `contentDir`, `contentRelative` и `externalUrls`; принадлежность конфигурации описана в [руководстве по таргетам](../targets.ru.md).

Перед чтением или записью файла артефакта вызовите `await assertArtifactPath(ctx.outDir, destination)`, импортировав функцию из `nuckty`. Она отклоняет существующие символические ссылки внутри заданного корня и пути, выходящие за его пределы.

## Пример: стадия поискового индекса

Стадия создаёт простой индекс URL, заголовков страниц и разделов:

```ts
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { DocumentData, NucktyEnv } from 'nuckty';
import { assertArtifactPath } from 'nuckty';

export function register(env: NucktyEnv): void {
    env.pipeline.registerStage('search', async (ctx) => {
        const sitemap = ctx.store['sitemap'] as DocumentData['sitemap'] | undefined;
        if (!sitemap) {
            throw new Error('The sitemap stage must run first');
        }
        const index = Object.values(sitemap.pages).map((page) => ({
            url: page.url,
            title: page.title,
            headings: page.headings?.map((heading) => heading.text) ?? [],
        }));
        const destination = join(ctx.outDir, 'search.json');

        await assertArtifactPath(ctx.outDir, destination);
        await writeFile(destination, JSON.stringify(index));
    }, { phase: 'emit' });
}
```
Сохраните модуль как `ext/search.ts` и добавьте `'./ext/search.ts'` в `ext` глобальной конфигурации. После сборки `search.json` появится в артефакте и манифесте, но `.json` не получает Brotli/Gzip в стандартной стадии [сжатия](../../out/compression.ru.md). Для хука используйте `env.pipeline.after` или `before` с именем существующей стадии.

## Типичные применения

- **Поисковый индекс** (Orama, SQLite FTS5, lunr) — стадия после [HTML](../../out/html.ru.md), читает контент страниц, записывает индекс в артефакт.
- **Конфигурация хостинга** — стадия в `emit`, генерирует конфигурацию Caddy или особую конфигурацию nginx.
- **Подготовка [изображений](../../out/images.ru.md)** — хук `before('images', ...)` создаёт варианты до расчёта хэша семейства и копирования файлов. Для отдельного шага перед сборкой используйте [команду конвертации](../../ext/command/convert-images.ru.md).

## Когда выбирать pipeline

Изменить артефакт или ход сборки — это `pipeline`. Добавить конструкцию markdown-разметки — это [markdown-расширение](markdown.ru.md). Добавить блок интерфейса — это [block-расширение](block.ru.md).

## Каталог pipeline-расширений

Готовые pipeline-расширения собраны в [каталоге](../../ext/pipeline.ru.md).
