# nuckty-ext-command-validate-vnu

The `nuckty validate` command checks the built HTML with the external [W3C Nu Html Checker](https://validator.w3.org/nu/) validator (vnu.jar). The extension is optional and requires a JVM.

## Type

[command](../../how/ext/command.md) — adds the `validate` command via `env.commands`.

## What it does

The command checks every HTML file in the artifact through Nu Html Checker — the W3C validator for HTML5/CSS/SVG. To keep validation time down:

- **HTTP daemon** — vnu.jar runs as an HTTP server on `:8888` (one JVM process per series of checks, not one process per file).
- **Parallel requests** — files are checked with concurrent POST requests to the daemon.
- **Content-based cache** — within a single run, a completed result can be reused for identical content. Concurrent checks may both send a request before the cache is populated.
- **Lazy startup** — the daemon starts on the first `validate`; after the check, the extension stops it on its own.

## Why vnu and not a TypeScript alternative

Nu Html Checker checks minimal HTML using the standard's optional-tag omission rules, which [nuckty's minimization](../../out/html.md) relies on. It provides an external document-structure check alongside engine tests.

Starting the JVM has a cost, so the extension is optional. Tests of the [minimization rules](../../out/html.md) verify specific transformations and do not replace validation of consumer [templates](../../how/templates.md).

Port `127.0.0.1:8888` must be free: an already occupied port fails before Java starts. The availability check does not eliminate a race with another process binding between the check and Java startup. Unit tests do not certify arbitrary consumer templates.

## When to run the check

- Before a site release — a final check that the artifact conforms to HTML5.
- When debugging a complex block — to make sure the structure does not violate the specification.
- In CI — as a gate before deploying (if the time budget allows starting the JVM).

## Running the check

```bash
npx nuckty build main
npx nuckty validate main
```

`validate [target]` selects the named target, or the first declared target when omitted. Build it first: the command recursively checks `.html` files in `<outDir>/html/`, including nested directories. An unknown target, missing directory, empty file set, or validation errors produce a nonzero exit code. Flags are not supported.

## Installation

This example extends the quickstart with the standard `nuckty-ext-block-root` document handler. Add the new extension to `ext` in the global `config/config-nuckty.ts`, retaining the other entries. If you use a custom document handler, keep its registration instead of `nuckty-ext-block-root`.

Install a maintained system JVM before running `npm install`. The extension includes a pinned `vnu-jar` dependency. Its upstream postinstall downloads a JRE when system Java is missing; Nuckty validation uses `java` on PATH.

Run the command below from the extracted [starter project](../../how/start.md); prepared extension archives are in `packages/`.

```
npm install ./packages/nuckty-ext-command-validate-vnu-1.0.0-beta1.tgz
```

```ts
import { defineNucktyConfig } from 'nuckty';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['nuckty-ext-block-root', 'nuckty-ext-command-validate-vnu'],
});
```

Requires `java` in `PATH` (JVM 17+). Every run starts the daemon anew: startup and validation time depend on the JVM, hardware and file count.

