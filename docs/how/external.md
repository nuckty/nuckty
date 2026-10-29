# External repositories

Site content does not have to live in the same repository as blocks and configs. Texts and [images](../out/images.md) can live in separate content repositories, and the engine assembles the site from them. This is convenient when one content set serves several sites, or when a separate team works on the texts.

A clean separation matters here: **the core reads content from a directory on disk**, and **an extension fills that directory**. Cloning git repositories is not part of the core — it is an optional tool, like everything else in the ecosystem (see [packages and repository](../why/repos.md)).

## Core: the content root

The engine reads `.md` files from the content root — the first level in [levels.json](blocks/levels.md), `content/` by default:

```json
["content", "blocks"]
```

The [sitemap](sitemap.md) line `[models, free/models.md]` resolves to `content/free/models.md`. The directory can be local or point to a clone of an external repository — the engine does not care how the files got there. It only reads what is already on disk: the core does no cloning and no updating.

This mirrors [image encoding](../ext/command/convert-images.md): the engine copies finished files, and a separate command prepares them.

## Extension: filling the directory

Repository preparation requires `git` in `PATH`, and updates also require Git LFS; see the [preparation command](../ext/command/content-external.md).

The preparation command reads the global `config/external.json`, an array of Git URLs. An entry can pin a version and keep only one subdirectory of the repository; see the [preparation command](../ext/command/content-external.md#version-and-subdirectory). It accepts no target argument; a missing file or an empty array prepares nothing:

```json
[
    "git@github.com:acme/acme-content.git",
    "git@github.com:acme/acme-assets.git"
]
```

Filling is a [command extension](ext/command.md): the `nuckty content-external` command reads `external.json`, clones each repository into `external/<repo>/` (the directory name is the repository name without `.git`), and updates the working copy. Then add the clone as the first level in `levels.json`, and the engine reads content from there:

```json
["external/acme-content", "content", "blocks"]
```

This is a separate step, like [image preparation](../ext/command/convert-images.md). The build does not run it automatically. Offline operation requires prepared files and extensions that do not access the network. Reproducibility requires fixed versions and metadata. The core may also use Git for source timestamps; without it they are `null`.

```
external/
  acme-content/     ← the clone, the first level in levels.json
  acme-assets/      ← shared assets
```

Keep `external/` out of the site's Git repository: add it to `.gitignore`. The preparation command does not create that rule or edit `levels.json` for you.

## Repository roles in site.json

`config/site.json` can describe repository roles:

| Field | Purpose |
|---|---|
| `contentRepo` | The main content repository — usually the one listed as the first level in `levels.json`. |
| `assetRepos` | Additional repositories with assets (images, downloadable files). |
| `githubRawBase` | The base for rewriting links to raw GitHub files. `null` — do not rewrite. |
| `baseUrl` | The site's absolute URL. With `githubRawBase` set, raw-file URLs under that base in code text become `<baseUrl>/<file>`. |

`contentRepo` and `assetRepos` are descriptive fields: they do not select the Markdown root or filter asset scanning. The first `levels.json` entry selects the root; `external.json` in the current target’s `configDir` selects external stage inputs. With separate configuration directories, keep these lists consistent with the global `config/external.json` read by the preparation command.

## Why this is useful

- **Separation of roles.** One team works on the texts, another on the engine and the page layout. Content lives its own life, and so does the build.
- **One content set — several sites.** A single content repository can serve several [targets](targets.md) or different sites.
- **Clean sources.** The site repository holds no copy of someone else's content — only a reference in `external.json` and a path in `levels.json`.

## What this does not replace

External repositories are about content sources, not deployment: the finished artifact is still built in `outDir` and deployed as a whole (see [FTP deployment](../ext/command/deploy-ftp.md)). And this is not a replacement for [extensions](ext/index.md): extensions are connected through `ext[]`, while `external.json` merely lists content sources.

