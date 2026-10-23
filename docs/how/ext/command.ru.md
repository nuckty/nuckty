# Command-расширение

Command-расширение добавляет команду в CLI: `nuckty <команда>`. Точка входа — `env.commands`. Применяется для действий за рамками встроенной `build`: публикация на сервер, локальная раздача через `nuckty serve`, проверка валидности.

## API

```ts
interface NucktyEnv {
    commands: {
        add(name: string, description: string, handler: CommandHandler, options?: {
            booleanFlags?: readonly string[];
        }): void;
    };
}
```

`CommandHandler` — функция: получает разобранные аргументы и флаги, запускает команду и возвращает код завершения.

## Пример: сведения о таргете

```ts
import process from 'node:process';
import type { NucktyEnv } from 'nuckty';

export function register(env: NucktyEnv): void {
    env.commands.add('target-info', 'show a configured target', async (args) => {
        const names = Object.keys(args.config.targets);
        const name = args.positional[0] ?? names[0];
        const target = name === undefined || !Object.hasOwn(args.config.targets, name)
            ? undefined
            : args.config.targets[name];

        if (target === undefined) {
            process.stderr.write('Unknown or missing target\n');
            return 1;
        }
        const output = args.flags['json'] === true
            ? JSON.stringify({ name, ...target }, null, 2)
            : `${name}: ${target.outDir}`;
        process.stdout.write(output + '\n');
        return 0;
    }, { booleanFlags: ['json'] });
}
```

Сохраните модуль как `ext/target-info.ts` и добавьте `'./ext/target-info.ts'` в `ext` глобальной конфигурации. Пользователь запускает:

```bash
npx nuckty target-info --json
```

Обработчик выводит конфигурацию первого [таргета](../targets.ru.md). Чтобы выбрать другой, передайте его имя: `npx nuckty target-info main --json`, где `main` — имя из вашей конфигурации. Пример принимает необязательное имя и флаг `--json`; проверку остальных аргументов можно добавить в обработчик.

## Контракт обработчика

Обработчик получает:

- `args.positional` — позиционные аргументы (таргеты, пути).
- `args.flags` — объект флагов с ключами без `--`. Укажите флаги без значения в `options.booleanFlags`; следующий токен при этом остаётся позиционным. Для остальных флагов сохраняется форма `--name value`. Обе формы поддерживают `--name=value`, а `--` завершает разбор флагов. Например, при `booleanFlags: ['dry-run']` команда `nuckty deploy-ftp --dry-run staging` даст `positional = ['staging']` и `flags['dry-run'] = true`.
- `args.config` — конфигурация пользователя, уже загруженная ядром, и `args.cwd` — корень проекта.

Возвращает код завершения: `0` — успех, ненулевой код — ошибка. Этот код ядро передаёт процессу.

## Типичные команды

- **`nuckty deploy-ftp [target]`** — публикация артефакта на сервер. См. [`nuckty-ext-command-deploy-ftp`](../../ext/command/deploy-ftp.ru.md).
- **`nuckty serve [--port N]`** — локальная раздача сайта через nginx. См. [`nuckty-ext-command-serve`](../../ext/command/serve.ru.md).
- **`nuckty validate`** — проверка [HTML](../../out/html.ru.md) внешним валидатором. См. [`nuckty-ext-command-validate-vnu`](../../ext/command/validate-vnu.ru.md).

## Когда выбирать command

Если действие — отдельная операция с готовым артефактом (публикация, раздача через `nuckty serve`, проверка), это `command`. Если действие меняет сам процесс сборки, это [pipeline-расширение](pipeline.ru.md).

## Каталог command-расширений

Готовые command-расширения собраны в [каталоге](../../ext/command.ru.md).
