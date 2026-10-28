# nuckty

nuckty — генератор статических сайтов с шаблонизатором BEMJSON и необязательными расширениями.

| Пакет | Каталог | Назначение |
|---|---|---|
| [@nuckty/core](https://www.npmjs.com/package/@nuckty/core) | [packages/core](packages/core/) | Ядро: шаблонизатор BEMJSON, программируемый конвейер сборки, несколько таргетов. |
| [@nuckty/ext-block-gallery](https://www.npmjs.com/package/@nuckty/ext-block-gallery) | [packages/ext-block-gallery](packages/ext-block-gallery/) | Галерея изображений с лайтбоксом через `:::gallery`. |
| [@nuckty/ext-block-grid](https://www.npmjs.com/package/@nuckty/ext-block-grid) | [packages/ext-block-grid](packages/ext-block-grid/) | Многоколоночная сетка через `:::grid`. |
| [@nuckty/ext-block-root](https://www.npmjs.com/package/@nuckty/ext-block-root) | [packages/ext-block-root](packages/ext-block-root/) | Блок-обёртка страницы `root` (`<html>`, `<head>`, `<body>`). |
| [@nuckty/ext-command-content-external](https://www.npmjs.com/package/@nuckty/ext-command-content-external) | [packages/ext-command-content-external](packages/ext-command-content-external/) | Команда наполнения контента из внешних репозиториев Git. |
| [@nuckty/ext-command-convert-images](https://www.npmjs.com/package/@nuckty/ext-command-convert-images) | [packages/ext-command-convert-images](packages/ext-command-convert-images/) | Команда конвертации PNG/JPEG в AVIF и WebP через sharp. |
| [@nuckty/ext-command-deploy-ftp](https://www.npmjs.com/package/@nuckty/ext-command-deploy-ftp) | [packages/ext-command-deploy-ftp](packages/ext-command-deploy-ftp/) | Команда публикации собранного сайта по FTP/FTPS. |
| [@nuckty/ext-command-serve](https://www.npmjs.com/package/@nuckty/ext-command-serve) | [packages/ext-command-serve](packages/ext-command-serve/) | Команды локального просмотра и остановки сайта. |
| [@nuckty/ext-command-validate-vnu](https://www.npmjs.com/package/@nuckty/ext-command-validate-vnu) | [packages/ext-command-validate-vnu](packages/ext-command-validate-vnu/) | Команда проверки HTML через vnu.jar. |
| [@nuckty/ext-markdown-typography-ru](https://www.npmjs.com/package/@nuckty/ext-markdown-typography-ru) | [packages/ext-markdown-typography-ru](packages/ext-markdown-typography-ru/) | Русская типографика: тире и неразрывные пробелы. |
| [@nuckty/ext-markdown-video](https://www.npmjs.com/package/@nuckty/ext-markdown-video) | [packages/ext-markdown-video](packages/ext-markdown-video/) | Встраивание видео через `@[provider](id)`. |

[Документация](docs/) · [Демо](https://demo.nuckty.ru/) · [Сайт](https://nuckty.ru/)

## Разработка

```sh
npm install
npm run build
npm test
npm run changeset
```
