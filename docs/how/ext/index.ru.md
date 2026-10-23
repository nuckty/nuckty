# Расширения

Расширения добавляют nuckty новые возможности. Пакет или локальный модуль экспортирует точку входа `register(env)` и через фасады движка регистрирует эти возможности. Доступны пять точек расширения.

## Пять точек

| Тип | Что расширяет | Точка входа |
|---|---|---|
| [pipeline](pipeline.ru.md) | Стадии сборки | `env.pipeline` |
| [markdown](markdown.ru.md) | Преобразование Markdown → [BEMJSON](../bemjson.ru.md) | `env.markdown` |
| [block](block.ru.md) | Набор БЭМ-блоков | `env.levels` |
| [command](command.ru.md) | Команды CLI | `env.commands` |
| [document](document.ru.md) | Данные страницы → BEMTree документа | `env.document` |

Один пакет может сочетать несколько типов в одном `register`. Например, расширение для документации сразу добавляет блок оглавления, конструкцию markdown-разметки `:::callout` и стадию поискового индекса.

## register(env)

В глобальном `config/config-nuckty.ts` укажите пакеты npm или локальные модули расширений. Движок загружает их по порядку и вызывает именованный `register`, а при его отсутствии — функцию по умолчанию.

```ts
import { defineNucktyConfig } from 'nuckty';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['nuckty-ext-block-root', './ext/search.ts'],
});
```

Расширения выполняются с правами процесса сборки; фасады не изолируют их код. Для локального каталога загрузчик выбирает корневой `exports` из `package.json` по активным условиям Node ESM в порядке объявления, включая вложенные условия. Совпавший `null` запрещает загрузку; путь в `exports` должен оставаться внутри каталога пакета. Если `exports` отсутствует, загрузчик использует `main`. Локальные файлы можно подключать напрямую.

## Как выбрать тип

- Нужна новая **стадия сборки** (поисковый индекс, лента RSS, обработка артефакта) → `pipeline`.
- Нужна **конструкция markdown-разметки** (`:::gallery`, `:::callout`, видео) → `markdown`.
- Нужен **набор блоков** (компоненты интерфейса, документационные блоки) → `block`.
- Нужна **команда CLI** (`nuckty deploy-ftp`, `nuckty serve`, `nuckty validate`) → `command`.
- Нужен **обработчик документа** → [document](document.ru.md).

Готовые расширения собраны в [каталоге](../../ext/index.ru.md).

Для каждой сборки нужен один обработчик документа. Стандартный `nuckty-ext-block-root` регистрирует его и уровень блоков; собственный обработчик может обойтись без root. Он получает `DocumentData` (page, content, [sitemap](../sitemap.ru.md), assets, alternates, target, lang).

