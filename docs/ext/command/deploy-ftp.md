# @nuckty/ext-command-deploy-ftp

Deploys the built artifact to [shared hosting](../../out/hosting.md) over FTP. The `nuckty deploy-ftp [target]` command synchronizes files against a manifest: it sends only the changed files to the server and deletes the extras.

## Type

[command](../../how/ext/command.md) — adds the `deploy-ftp` command via `env.commands`.

## What it does

The command reads [manifest.json](../../out/assets.md) from the built artifact, compares the manifest with the files on the server, and transfers only the necessary changes:

1. **File list** — a recursive `LIST` request returns a "path → size" mapping that the command checks files against.
2. **Server manifest** — without `--force`, an existing `manifest.json` is downloaded for hash comparison. If absent, all local files are uploaded; `--force` skips its download.
3. **Change calculation** — the command finds new, changed, and deleted files. Hashes are compared only when sizes match.
4. **Accidental-wipe protection** — if the share of deleted files exceeds a threshold (30% by default), the command stops and suggests `--allow-mass-delete`.
5. **Upload** — only the changed files. Passive mode; explicit FTPS by default, plain FTP only when `secure` is `false`. After each upload, the command attempts `MFMT` to preserve modification time; unsupported timestamp restoration does not stop deployment.
6. **Deleting extra files on the server** — files no longer present in the artifact are deleted (`manifest.json` is left alone).
7. **Verify and retry** — after the transfer, the command runs `LIST` again and retries the upload on failure.
8. **Manifest last** — before the first change on the server the old `manifest.json` is removed, and the new one is uploaded after all files have been transferred successfully. An interrupted deploy leaves no manifest, so the next run uploads every file instead of trusting stale hashes.

## Options

```
nuckty deploy-ftp [target] [--force] [--allow-mass-delete] [--dry-run]
```

| Option | Action |
|---|---|
| `target` | Target name from `config-nuckty.ts`. Without an argument — the first target. |
| `--force` | Upload every local file without comparing hashes; the mass-deletion guard still applies. |
| `--allow-mass-delete` | Allow deleting more remote files than the guard permits. |
| `--dry-run` | Show what would be uploaded or deleted, without performing the real actions. |

`--dry-run` connects and reads server state without changing files. Publication is not atomic: transferred files may remain after a later failure; the final manifest is sent only after successful operations.

## Authentication

Credentials come from `config/auth-ftp.json` or a complete set of `FTP_HOST`, `FTP_USER`, `FTP_PASSWORD`, and `FTP_PATH`, with optional `FTP_PORT` and `FTP_SECURE`. A complete environment configuration takes precedence. Keep the credentials file out of version control. Example:

```json
{
    "host": "ftp.example.ru",
    "user": "user",
    "password": "...",
    "remote_path": "/public_html",
    "port": 21,
    "secure": true
}
```

In CI, supply credentials through environment variables. If you use `auth-ftp.json`, keep it out of version control: the file contains real credentials.

## Target hosting constraints

The server must provide FTP or FTPS access. SSH, rsync, and Git on the server are not required. The extension uses:

- **basic-ftp** — a client with passive mode and TLS (FTPS) support, no SSH.
- **MFMT** — restoring modification times via an FTP command rather than over SSH.
- **Manifest-based synchronization** — hash comparison instead of rsync.

The transfer protocol, rather than the server class, determines compatibility. For details, see the [hosting decision](../../why/hosting.md).

## Installation

This example extends the quickstart with the standard `@nuckty/ext-block-root` document handler. Add the new extension to `ext` in the global `config/config-nuckty.ts`, retaining the other entries. If you use a custom document handler, keep its registration instead of `@nuckty/ext-block-root`.

Install the extension from npm in the extracted [starter project](../../how/start.md):

```
npm install --save-exact @nuckty/ext-command-deploy-ftp@1.0.0-rc.3
```

```ts
import { defineNucktyConfig } from '@nuckty/core';

export default defineNucktyConfig({
    targets: { main: { configDir: 'config/', outDir: 'site/' } },
    ext: ['@nuckty/ext-block-root', '@nuckty/ext-command-deploy-ftp'],
});
```

The core does not depend on basic-ftp — the dependency lives only in this extension.

Before connecting, the command verifies every local file size and MD5 against the manifest. It repeats verification before the final manifest transfer and rejects a changed artifact. Remote verification uses LIST and size; it does not independently verify remote content hashes. Do not modify an artifact during deployment.

FTPS with certificate verification is the default; TLS failure never falls back to plain FTP. `secure: false` or `FTP_SECURE=false` selects plain FTP, which sends the password unencrypted; the command then prints a warning. `port` defaults to 21 and must be an integer from 1 to 65535. `progress: false` in `auth-ftp.json` turns off progress output; environment configuration always prints it.
