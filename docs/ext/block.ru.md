# Block-расширения

Здесь перечислены block-расширения, которые добавляют наборы БЭМ-блоков через `env.levels`. Нужные блоки попадают в сборку по [зависимостям](../how/blocks/deps.ru.md).

## Как это работает

Block-расширение добавляет уровень:

```ts
import { fileURLToPath } from 'node:url';
import type { NucktyEnv } from '@nuckty/core';

export function register(env: NucktyEnv): void {
    env.levels.add(fileURLToPath(new URL('../blocks/', import.meta.url)));
}
```

Полный контракт — в [руководстве по block-расширениям](../how/ext/block.ru.md).

## Реестр

- [`@nuckty/ext-block-root`](block/root.ru.md) — даёт стандартный обработчик документа и блок `root` — [обёртку документа HTML](../out/html.ru.md).
- [`@nuckty/ext-block-gallery`](block/gallery.ru.md) — галерея с лайтбоксом.
- [`@nuckty/ext-block-grid`](block/grid.ru.md) — многоколоночная раскладка (`:::grid`).

Видео (`@[provider](id)`) — тоже конструкция markdown-разметки, но без парного блока; пакет [`@nuckty/ext-markdown-video`](markdown/video.ru.md) описан отдельно.
