# @nuckty/ext-command-convert-images

Encoding images to AVIF and WebP. The `nuckty convert-images` command walks the source images and creates AVIF and WebP files next to the originals. At [build](../../out/images.md) time, the engine copies the ready-made files.

## Type

[command](../../how/ext/command.md) — adds the `convert-images` command via `env.commands`.

## Why a separate command

The engine does not encode images itself: at build time it copies the ready-made `image.avif` and `image.webp` sitting next to the original. Preparing these files is the content author's job, and this command does it.

A separate encoding step lets subsequent builds reuse prepared variants. Run the command when new or changed images appear. The build copies the prepared files by [content-hash](../../out/images.md); storing them in the content repository is a project decision.

## What it does

The command scans PNG/JPEG and encodes both formats from the original. WebP is kept only when smaller than the original. AVIF must be smaller than the new WebP, or smaller than the original when no WebP was created. Quality is lowered progressively; a variant that cannot meet the target even at quality 1 is omitted. sharp belongs only to this extension.

## Content-based cache

`convert-images.json` at the scan root stores the original's full MD5, variant sizes, and completion. Skipping requires a completed entry and nonempty regular files for the recorded variants at that source path. Legacy entries without completion are re-encoded. Save variants and the cache yourself if project policy requires version control; the command does not commit them.

Invalid cache data and output-name collisions fail before writing. Variants are replaced through temporary files after successful encoding; a successful WebP may remain when AVIF fails.

## Options

```
nuckty convert-images <contentDir> [--dry-run] [--force]
```

| Option | Action |
|---|---|
| `contentDir` | Scan root; required. Hidden directories and `node_modules` are skipped. |
| `--dry-run` | Show what would be encoded, without writing files. |
| `--force` | Re-encode even the files that are in the cache. |

Starting quality levels are set in the command code: AVIF 50 and WebP 90 for both PNG and JPEG.

## Installation

This example extends the quickstart with the standard `@nuckty/ext-block-root` document handler. Add the new extension to `ext` in the global `config/config-nuckty.ts`, retaining the other entries. If you use a custom document handler, keep its registration instead of `@nuckty/ext-block-root`.

Install the extension from npm in the extracted [starter project](../../how/start.md):

```bash
npm install --save-exact --save-dev @nuckty/ext-command-convert-images@1.0.0-rc.5
```

```ts
import { defineNucktyConfig } from '@nuckty/core';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['@nuckty/ext-block-root', '@nuckty/ext-command-convert-images'],
});
```

The `sharp` package lives only in this extension's dependencies — the engine does not pull it in.

## Where to run it

Run from the site root where the extension is installed and configured, passing the content path: `npx @nuckty/core convert-images external/content`. The build uses prepared variants; whether conversion runs in CI is a project decision.
