## MODIFIED Requirements

### Requirement: Build context
Stages SHALL receive ctx.cwd, ctx.configDir, ctx.buildDir, ctx.outDir and ctx.store. The shared buildDir SHALL hold intermediates and the last built target’s nginx.conf; previews keep their own configuration under `serve/<target>/`. The outDir SHALL hold the target artifact. The store SHALL carry stage results such as sitemap, images and bundle hashes.

#### Scenario: Context separates build and output dirs
- **WHEN** the hosting finalizers run
- **THEN** it writes `nginx.conf` under `ctx.buildDir` and `.htaccess` under `ctx.outDir`
- **AND** ctx.store carries intermediate values while files are written under the configured directories
