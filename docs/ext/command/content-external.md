# nuckty-ext-command-content-external

Populating the content root from external git repositories. The `nuckty content-external` command reads `external.json`, clones the listed repositories, and updates the working copies. It is a separate step before the build, not part of it.

## Type

[command](../../how/ext/command.md) — adds the `content-external` command via `env.commands`.

It requires `git` in `PATH`. Updates also require Git LFS: after `git pull`, the command always runs `git lfs ls-files`, and runs `git lfs pull` only when LFS files are listed. An inspection or fetch error fails the update; the preceding `git pull` may already have changed the working copy.

## What it does

1. Reads `config/external.json` — an array of git URLs.
2. Clones into `external/<repo>/`; updates an existing copy only when the origin matches and the working tree is clean. Foreign, modified, unverifiable, or symlinked copies are rejected.
3. After preparation, add the clone as the first level in [levels.json](../../how/blocks/levels.md), and `nuckty build` reads the content from disk.

The command reads only the global `config/external.json`, not a target’s `configDir`, and accepts no target name. A missing file or an empty array `[]` means there is nothing to prepare. Keep separate target lists consistent with the global file; see [external repositories](../../how/external.md).

## Options

```
nuckty content-external [--dry-run]
```

| Option | Action |
|---|---|
| `--dry-run` | Show which repositories would be cloned, updated, or refused, without writing to disk. |

## Why a separate command instead of part of the build

Cloning and updating require network access and an installed `git`. If they happened on every build, `nuckty build` would no longer be deterministic or offline, and its result would start depending on the state of the remote repositories.

Preparation runs explicitly from the configured site root. `--dry-run` performs local Git checks but does not access the network or write files. The build does not run clone/fetch itself. Offline operation requires prepared inputs and extensions that do not access the network; reproducibility also requires fixed versions and metadata. The core may use Git for source timestamps; without it they are `null`.

## Installation

This example extends the quickstart with the standard `nuckty-ext-block-root` document handler. Add the new extension to `ext` in the global `config/config-nuckty.ts`, retaining the other entries. If you use a custom document handler, keep its registration instead of `nuckty-ext-block-root`.

Install the prepared package from `packages/` in the extracted [starter project](../../how/start.md):

```bash
npm install --save-dev ./packages/nuckty-ext-command-content-external-1.0.0-beta1.tgz
```

```ts
import { defineNucktyConfig } from 'nuckty';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['nuckty-ext-block-root', 'nuckty-ext-command-content-external'],
});
```
