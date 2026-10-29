# Расширения

Каталог расширений экосистемы nuckty. Расширения делятся на [пять типов](../how/ext/index.ru.md); каждому отведён свой раздел. Адрес страницы повторяет имя пакета: `/ext/block/root` → `@nuckty/ext-block-root`.

Каждое официальное расширение — отдельный npm-пакет в монорепозитории nuckty — реализует [контракт `register(env)`](../how/ext/index.ru.md). Ядро nuckty не зависит ни от одного из них.

## По типам

- [Pipeline-расширения](pipeline.ru.md) — добавляют стадии сборки.
- [Markdown-расширения](markdown.ru.md) — добавляют конструкции markdown-разметки.
- [Block-расширения](block.ru.md) — добавляют наборы БЭМ-блоков.
- [Command-расширения](command.ru.md) — добавляют команды CLI.
- [Расширения документа](document.ru.md) — задают документ из данных страницы.

## Как добавить своё

Расширение реализует `register(env)`. [Руководство](../how/ext/index.ru.md) описывает контракт. Чтобы добавить его в документацию, создайте страницу, ссылку в каталоге и запись в `pages.json` документации. Публикация пакета npm сама по себе каталог не меняет.

## Что есть в экосистеме

Краткая сводка:

| Пакет | Тип | Назначение |
|---|---|---|
| [`@nuckty/ext-block-root`](block/root.ru.md) | block, document | [обёртка страницы](../out/html.ru.md) (`root`) |
| [`@nuckty/ext-block-gallery`](block/gallery.ru.md) | block, markdown | Галерея с лайтбоксом |
| [`@nuckty/ext-block-grid`](block/grid.ru.md) | block, markdown | Многоколоночная раскладка (`:::grid`) |
| [`@nuckty/ext-markdown-video`](markdown/video.ru.md) | markdown | Встраивание видео `@[provider](id)` (YouTube/RuTube/VK) |
| [`@nuckty/ext-markdown-typography-ru`](markdown/typography-ru.ru.md) | markdown | Русская типографика (тире, неразрывные пробелы) |
| [`@nuckty/ext-command-deploy-ftp`](command/deploy-ftp.ru.md) | command | Публикация по FTP через манифест |
| [`@nuckty/ext-command-convert-images`](command/convert-images.ru.md) | command | Кодирование [изображений](../out/images.ru.md) в AVIF/WebP |
| [`@nuckty/ext-command-content-external`](command/content-external.ru.md) | command | Контент из внешних репозиториев Git |
| [`@nuckty/ext-command-serve`](command/serve.ru.md) | command | Локальная раздача сайта и остановка |
| [`@nuckty/ext-command-validate-vnu`](command/validate-vnu.ru.md) | command | W3C Nu Checker (необязательное расширение, JVM) |
