# Markdown-расширения

Каталог расширений типа `markdown`. Они добавляют к CommonMark [конструкции markdown-разметки](../how/ext/markdown.ru.md): выноски, галереи, сетки, видео. Каждое подключается через `env.markdown`.

## Как это работает

Конструкции на основе директив используют [обобщённые директивы](../how/ext/markdown.ru.md) (`:::name`, `::name`, `:name`). Расширение отображает директиву прямо в узел блока через `env.markdown.directive(...)`, а для другого синтаксиса и произвольных преобразований есть низкоуровневый `env.markdown.use(...)`. Полный контракт — в [руководстве по markdown-расширениям](../how/ext/markdown.ru.md).

Рабочий пример преобразования MDAST описан в [руководстве](../how/ext/markdown.ru.md). `node.children` — MDAST, а не [BEMTree](../how/bemjson.ru.md): передавать его прямо в `content` нельзя.

Конструкция markdown-разметки почти всегда идёт в паре с [block-расширением](block.ru.md), которое поставляет блок, в который она раскрывается. Поэтому один пакет часто совмещает markdown- и block-расширение.

## Реестр

Markdown-расширения:

- [`@nuckty/ext-markdown-typography-ru`](markdown/typography-ru.ru.md) — русская типографика: неразрывный пробел перед тире. Блока не добавляет — только правит текст.
- [`@nuckty/ext-markdown-video`](markdown/video.ru.md) — встраивание видео `@[provider](id)` (YouTube/RuTube/VK). Блок не поставляет — разметку плеера строит плагин.

Конструкции markdown-разметки, идущие в паре с блоком, входят в block-расширения:

- **Галерея** (`:::gallery`) — в пакете [`@nuckty/ext-block-gallery`](block/gallery.ru.md).
- **Сетка** (`:::grid`) — в пакете [`@nuckty/ext-block-grid`](block/grid.ru.md).
- **Выноска** (`:::callout`) — кандидат на отдельный пакет.
