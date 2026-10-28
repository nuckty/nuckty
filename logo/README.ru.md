# Логотип nuckty

Канонический исходник логотипа SVG для nuckty.

Исходный файл — `nuckty-logo-black-transparent.svg`. Тёмные варианты, подсветка при наведении и favicon поддерживаются в проектах сайтов. Настройки оптимизации находятся в `../config/config-svgo.js`.

## Оптимизация SVG

Оптимизируйте готовые SVG из корня репозитория:

```sh
npm run logo:optimize
```

Команда использует `../config/config-svgo.js`. Редактируемые исходники (`_source.svg`) и построительные сетки (`_grid.svg`) исключены из обработки.

MIT: [LICENSE](../LICENSE).
