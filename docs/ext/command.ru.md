# Command-расширения

Каталог расширений типа `command` — тех, что добавляют команды CLI через `env.commands.add(...)`. Ядро nuckty содержит только `build`; остальные команды добавляют расширения.

## Как это работает

Command-расширение регистрирует команду:

```ts
export function register(env) {
    env.commands.add('deploy-ftp', 'publish the built site over FTP/FTPS', deployHandler);
}
```

Строка-описание показывается в `nuckty --help`.

Полный контракт — в [руководстве по command-расширениям](../how/ext/command.ru.md).

## Реестр

| Пакет | Команда | Назначение |
|---|---|---|
| [`@nuckty/ext-command-deploy-ftp`](command/deploy-ftp.ru.md) | `nuckty deploy-ftp` | Публикация артефакта на виртуальный [хостинг](../out/hosting.ru.md) по FTP |
| [`@nuckty/ext-command-convert-images`](command/convert-images.ru.md) | `nuckty convert-images` | Кодирование [изображений](../out/images.ru.md) в AVIF/WebP |
| [`@nuckty/ext-command-content-external`](command/content-external.ru.md) | `nuckty content-external` | Контент из внешних репозиториев Git |
| [`@nuckty/ext-command-serve`](command/serve.ru.md) | `nuckty serve`, `nuckty stop` | Локальная раздача сайта через nginx и её остановка |
| [`@nuckty/ext-command-validate-vnu`](command/validate-vnu.ru.md) | `nuckty validate` | Проверка [HTML](../out/html.ru.md) внешним W3C Nu Checker |

Добавьте нужное расширение в `config-nuckty.ts`, чтобы подключить его команду.
