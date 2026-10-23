# nuckty-logo

Canonical SVG logo source for nuckty 1.0.0-beta1.

Use `nuckty-logo-black-transparent.svg` as the source. Website-specific dark, hover and favicon variants are maintained by their consumers. Optimization settings are in `config/config-svgo.js`.

## Optimize SVG files

Install dependencies and optimize the production SVG files:

```sh
npm ci
npm run optimize
```

The command uses `config/config-svgo.js`. Editable source variants
(`_source.svg`) and construction grids (`_grid.svg`) are excluded.

MIT; see [LICENSE](LICENSE). This repository is an asset source with local npm tooling.

