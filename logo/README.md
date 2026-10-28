# nuckty logo

Canonical SVG logo source for nuckty.

Use `nuckty-logo-black-transparent.svg` as the source. Website-specific dark, hover and favicon variants are maintained by their consumers. Optimization settings are in `../config/config-svgo.js`.

## Optimize SVG files

Optimize the production SVG files from the repository root:

```sh
npm run logo:optimize
```

The command uses `../config/config-svgo.js`. Editable source variants (`_source.svg`) and construction grids (`_grid.svg`) are excluded.

MIT; see [LICENSE](../LICENSE).
