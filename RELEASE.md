# Release procedure

The 1.0.0-beta1 source release comprises core, ten extensions, demo, documentation and shared codestyle. The 11 npm packages are core and the ten extensions; demo remains private. Publish only a frozen source set whose local checks, exact package archives and remote CI have passed. Site deployment has its own artifact, visual, hosting and rollback checks.

## Maintained dependency repair

Core and the site consumer select the private MIT compatibility fork in `vendor/braces` through a local development dependency and npm override. Version `3.0.4-nuckty.1` identifies a local repair derived from `braces@3.0.3`, not an upstream release. Keep this source in checkouts used by `npm ci`; it is excluded from the runtime tarball. [SECURITY.md](vendor/braces/SECURITY.md) records provenance and the repair. Ordinary-output and deep-input regressions run with the core suite. Replace the fork only after an upstream fix passes equivalent checks.

## Freeze and verify

1. Preserve existing repository history and prepare publication commits from the reviewed source payload. Do not overwrite unrelated working-tree or staged changes. Retain source archives, a per-file inventory and archive SHA-256 receipts.
2. Run core lint, build and native-enabled coverage with `NUCKTY_HOSTING_HTTP=1`; install nginx and Apache for that gate. Run extension lint, build and tests, enabling `NUCKTY_SERVE_NATIVE=1` for serve and `NUCKTY_VNU_NATIVE=1` for validation. Java must be available before installing the validator dependency.
3. Run a full public lockfile audit for every package and consumer, including development dependencies: `npm audit --package-lock-only --audit-level=low --registry=https://registry.npmjs.org`. Registry errors or any low-or-higher finding fail the gate.
4. Check documentation with `node scripts/check-source-links.mjs`. Check demo clean installation and all-package offline smoke. Pack and retain all 11 final tarballs with SHA-256 and file receipts; inspect LICENSE, main, types, CLI and source-map completeness. Install these exact tarballs in an isolated consumer and rebuild after removing its installation archives.

Use the commands in each package's `package.json`; source and npm archive checks do not replace remote CI or a public-registry installation.

## Pinned source configuration

Publish core and the compatible extension commits under their `nuckty/<package-name>` repositories. In each extension repository, set `NUCKTY_CORE_REF` to the tested core commit's exact lowercase 40-character SHA. Branch names and tags are rejected.

In demo and the site consumer, `NUCKTY_SOURCES` must be a JSON object containing exactly the 11 package names: `nuckty`, `nuckty-ext-block-gallery`, `nuckty-ext-block-grid`, `nuckty-ext-block-root`, `nuckty-ext-command-content-external`, `nuckty-ext-command-convert-images`, `nuckty-ext-command-deploy-ftp`, `nuckty-ext-command-serve`, `nuckty-ext-command-validate-vnu`, `nuckty-ext-markdown-typography-ru`, and `nuckty-ext-markdown-video`. Each entry is `{ "repository": "nuckty/<package-name>", "ref": "<actual-40-character-commit-sha>" }`. Use real reachable commits, not placeholders. Nested local packages such as `vendor/braces` come from their owner checkout and need no separate repository entry.

Run CI on those commits and verify every run's head SHA and successful conclusion, including native Linux, coverage, audit and package-smoke gates. If a source or lockfile changes, update the corresponding pins and repeat affected gates. Enable branch protection after its required `verify` or documentation `source-links` check is visible and green. Shared codestyle has no executable CI gate.

## Publish the verified archives

Authenticate to the public npm registry with an account allowed to publish each name. Use the verified npm account with email `vitaly@harisov.name`. Publish the exact retained archives as 1.0.0-beta1 with `--tag beta` only after source CI is green. Record their registry integrity values and compare the registry tarballs with the retained candidate; then install exact 1.0.0-beta1 versions from the public registry in a clean consumer and verify types, CLI and build. Local `file:` dependencies do not prove registry installation.

Tag the matching source commits and retain a release record with the source SHA map, artifact hashes and CI URLs. If publication fails after some packages succeed, resume from the recorded state; never unpublish or overwrite an immutable version as a retry.

## Site deployment

Package publication does not deploy the consumer site. A push to the site's production branch can start its deployment workflow. Before that push, validate the actual immutable site artifact, visual behavior and hosting configuration, and keep a rollback artifact. Use the same tested artifact for deployment without an unchecked rebuild. Preserve original external checkouts and their untracked files; verify prepared snapshots and materialized LFS data independently.
