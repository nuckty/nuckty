# The repository family

## Decision

Maintain nuckty as a family of projects with shared rules in `nuckty-codestyle`. The core owns `nuckty build`; commands, content features, and block libraries are separate extension packages.

## Context

Users need different capabilities. A site that does not validate [HTML](../out/html.md) or deploy by FTP should not need the validator or FTP client as core dependencies.

## Alternatives

**One package.** Installation and release coordination are simpler, but optional dependencies become part of every installation.

**Several packages in a monorepo.** Packages can still be released independently; that arrangement needs a shared versioning and publication workflow.

**Independent repositories without shared rules.** Releases are separate, but language, API documentation, and verification conventions can drift.

## Argument

Separate packages isolate optional dependencies: basic-ftp belongs to the FTP extension, vnu-jar to validation, and sharp to image conversion. The core retains the Markdown, CSS, and JavaScript build tools.

The common [extension contract](../how/ext/index.md) exposes five facades: `pipeline`, `markdown`, `levels`, `commands`, and `document`. A package can use more than one facade. Local `AGENTS.md` files reference the shared codestyle and add project-specific rules.

## Consequences

A project can maintain its own history and release cycle while using the common contract. A capability can be added without changing the core when the existing facades support it; a new core contract still requires a core change.

Publishing a package does not automatically add a documentation page. Add the page to the [extension catalog](../ext/index.md) and to the documentation site's [sitemap](../how/sitemap.md). Planned repository names do not establish that public repositories or packages have already been published.

