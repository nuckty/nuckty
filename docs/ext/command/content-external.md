# @nuckty/ext-command-content-external

Populating the content root from external git repositories. The `nuckty content-external` command reads `external.json`, clones the listed repositories, and updates the working copies. It is a separate step before the build, not part of it.

## Type

[command](../../how/ext/command.md) — adds the `content-external` command via `env.commands`.

It requires `git` in `PATH`. Updates also require Git LFS: after `git pull` or moving a pinned copy to its `ref`, the command always runs `git lfs ls-files`, and runs `git lfs pull` only when LFS files are listed. An inspection or fetch error fails the update; the preceding pull or checkout may already have changed the working copy.

## What it does

1. Reads `config/external.json` — an array of Git URLs or objects with a pinned version and subdirectory (see below).
2. Clones into `external/<repo>/`; updates an existing copy only when the origin matches and the working tree is clean. Foreign, modified, unverifiable, or symlinked copies are rejected.
3. After preparation, add the clone as the first level in [levels.json](../../how/blocks/levels.md), and `nuckty build` reads the content from disk.

The command reads only the global `config/external.json`, not a target’s `configDir`, and accepts no target name. A missing file or an empty array `[]` means there is nothing to prepare. Keep separate target lists consistent with the global file; see [external repositories](../../how/external.md).

## Version and subdirectory

An entry can be an object instead of a URL string:

```json
[
    "git@github.com:acme/acme-content.git",
    { "url": "https://github.com/nuckty/nuckty.git", "ref": "v1.0.0", "path": "docs" }
]
```

| Field | Meaning |
|---|---|
| `url` | Repository URL, as in the string form. |
| `ref` | Tag or commit to check out; a branch name is rejected because a pin must not move. The copy is detached at this ref. The next run fetches, including tags moved upstream, and moves the copy to the ref currently in the file; a full 40-character commit that is already present needs no network. Without `ref`, the command pulls the default branch. |
| `path` | Subdirectory to keep. It must be a directory at the checked-out commit. The clone fetches only the files it checks out, and the working copy contains only this directory, without top-level files, at `external/<repo>/<path>/`. Git LFS files are fetched for this directory only. Without `path`, the whole repository is checked out. |

A copy pinned to a commit stays detached. If you remove `ref` from its entry, the command refuses to update it; delete `external/<repo>/` to follow the branch again. Unknown fields, a malformed `ref`, and a `path` that is absolute, contains `.` or `..` segments, or uses characters other than letters, digits, `.`, `_`, `+` and `-` stop the command before any Git work. A `ref` that is not a tag or commit of the repository, or a `path` missing at that commit, fails that repository before its working copy changes.

## Options

```
nuckty content-external [--dry-run]
```

| Option | Action |
|---|---|
| `--dry-run` | Show which repositories would be cloned, updated, or refused, with their `ref` and `path`, without writing to disk. |

## Why a separate command instead of part of the build

Cloning and updating require network access and an installed `git`. If they happened on every build, `nuckty build` would no longer be deterministic or offline, and its result would start depending on the state of the remote repositories.

Preparation runs explicitly from the configured site root. `--dry-run` performs local Git checks but does not access the network or write files. The build does not run clone/fetch itself. Offline operation requires prepared inputs and extensions that do not access the network; reproducibility also requires fixed versions and metadata. The core may use Git for source timestamps; without it they are `null`.

## Installation

This example extends the quickstart with the standard `@nuckty/ext-block-root` document handler. Add the new extension to `ext` in the global `config/config-nuckty.ts`, retaining the other entries. If you use a custom document handler, keep its registration instead of `@nuckty/ext-block-root`.

Install the extension from npm in the extracted [starter project](../../how/start.md):

```bash
npm install --save-exact --save-dev @nuckty/ext-command-content-external@1.0.0-rc.4
```

```ts
import { defineNucktyConfig } from '@nuckty/core';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['@nuckty/ext-block-root', '@nuckty/ext-command-content-external'],
});
```
