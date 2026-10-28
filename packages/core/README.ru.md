# nuckty

> **Все генераторы статических сайтов плохи. Этот просто чуть менее плох.**
>
> *(по мотивам mutt: «All mail clients suck. This one just sucks less.»)*

nuckty — генератор статических сайтов для документации и контентных проектов. Он объединяет шаблонизатор BEMJSON → HTML, программируемый конвейер сборки и таргеты для нескольких сайтов в одном репозитории. Результат включает заранее сжатые файлы и сгенерированную конфигурацию nginx и Apache. Его можно опубликовать по FTP на совместимом виртуальном хостинге.

Ядро предоставляет `nuckty build [target]`. Локальный просмотр, валидация, публикация и библиотеки блоков добавляются расширениями. В ядре нет блоков и страниц; каждый сайт регистрирует обработчик документа из стандартного расширения root или собственной реализации.

**Исходники документации:** [руководство для начала работы на русском](https://github.com/nuckty/nuckty/blob/main/docs/how/start.ru.md) · [английское руководство](https://github.com/nuckty/nuckty/blob/main/docs/how/start.md). Сайты документации: [nuckty.ru](https://nuckty.ru) (русский) · [nuckty.com](https://nuckty.com) (английский).

## Экосистема

| Репозиторий | Роль |
|---|---|
| [`nuckty`](https://github.com/nuckty/nuckty) | **Ядро** — движок `nuckty build`. Этот репозиторий. |
| [`nuckty-codestyle`](https://github.com/nuckty/nuckty/tree/main/codestyle) | Общие правила кода и документации для всех репозиториев `nuckty-*`. |
| [`@nuckty/ext-block-root`](https://github.com/nuckty/nuckty/tree/main/packages/ext-block-root) | Расширение: обёртка страницы (`root`). |
| [`@nuckty/ext-block-gallery`](https://github.com/nuckty/nuckty/tree/main/packages/ext-block-gallery) | Расширение: галерея изображений + лайтбокс. |
| [`@nuckty/ext-command-deploy-ftp`](https://github.com/nuckty/nuckty/tree/main/packages/ext-command-deploy-ftp) | Расширение: публикация по FTP с синхронизацией по манифесту. |
| [`@nuckty/ext-command-serve`](https://github.com/nuckty/nuckty/tree/main/packages/ext-command-serve) | Расширение: локальный просмотр `nuckty serve` и остановка `nuckty stop` (nginx). |
| [`@nuckty/ext-command-validate-vnu`](https://github.com/nuckty/nuckty/tree/main/packages/ext-command-validate-vnu) | Расширение: W3C Nu Html Checker (необязательно, JVM). |
| [`@nuckty/ext-block-grid`](https://github.com/nuckty/nuckty/tree/main/packages/ext-block-grid) | Адаптивная сетка текстовых ячеек. |
| [`@nuckty/ext-markdown-video`](https://github.com/nuckty/nuckty/tree/main/packages/ext-markdown-video) | Видео в Markdown. |
| [`@nuckty/ext-markdown-typography-ru`](https://github.com/nuckty/nuckty/tree/main/packages/ext-markdown-typography-ru) | Русская типографика. |
| [`@nuckty/ext-command-content-external`](https://github.com/nuckty/nuckty/tree/main/packages/ext-command-content-external) | Подготовка внешних репозиториев контента. |
| [`@nuckty/ext-command-convert-images`](https://github.com/nuckty/nuckty/tree/main/packages/ext-command-convert-images) | Подготовка вариантов AVIF/WebP. |
| [`nuckty-demo`](https://github.com/nuckty/nuckty/tree/main/demo) | Демо-проект для быстрого старта. |
| [`nuckty-docs`](https://github.com/nuckty/nuckty/tree/main/docs) | Исходный контент сайта документации. |

Официальные расширения следуют соглашению `@nuckty/ext-<тип>-<имя>`, где тип — один из `pipeline`, `markdown`, `block`, `command`, `document`. Имя пакета читается прямо из его URL в документации: `/ext/block/root` → `@nuckty/ext-block-root`.

Сторонние расширения могут использовать любое npm-имя, включая scope автора; укажите полное имя пакета в `ext`. Официальная организация владеет `@nuckty/core` и `@nuckty/ext-*`; имена репозиториев и команда `nuckty` сохраняются.

## Требования

- **Node.js 24+**
- **npm** или совместимый менеджер пакетов

CLI сам загружает конфигурацию на TypeScript. Отдельная установка TypeScript нужна для разработки и проверки типов пакетов, а не для сборки сайта-потребителя. Расширения и модули шаблонов используют ESM.

Для предпросмотра в браузере импортируйте `Templates`, `render` и `renderToHtml` из `@nuckty/core/browser`. Эта скомпилированная точка входа содержит чистый рендерер; команды сборки и Node API контекста шаблонов остаются в `@nuckty/core`.

## Границы доверия

Конфигурация сборки, расширения, шаблоны блоков и авторы Markdown считаются доверенными. Расширения работают с правами процесса сборки. Исходный HTML в Markdown и BEMJSON `raw` сохраняются; схемы URL в Markdown не фильтруются. Очищайте недоверенный контент до сборки: одного экранирования текста и атрибутов недостаточно.

Хеши используют усечённый MD5 для имён файлов и обнаружения изменений, а не для аутентификации. Публикуйте неизменяемый артефакт. Apache требует модулей и разрешений `.htaccess`, описанных в руководстве по хостингу; локальный nginx не доказывает корректность настройки удалённого сервера.

Лицензия MIT проекта относится к его собственному коду. Установленные зависимости сохраняют свои лицензии, в том числе Lightning CSS (MPL-2.0) и нативный libvips в sharp (LGPL-3.0-or-later). При распространении этих зависимостей сохраняйте применимые уведомления и выполняйте условия исходных проектов.

## CI публичных сайтов

Публикация GitHub Release с версией запускает выпуск в npm после проверки успешного CI для этого коммита в main. Сайт и демо обновляют точные зависимости из реестра после подтверждения контрольной суммы публичного пакета и выполняют деплой после своих проверок. См. [порядок выпуска и настройку trusted publisher](.github/RELEASING.ru.md).

## Лицензия

MIT — см. [LICENSE](LICENSE).

## Текущий кандидат

`1.0.0-beta2` — We call its Beta, coz it's betta then nothin

Изменения описаны в [CHANGELOG.ru.md](CHANGELOG.ru.md).
