# nuckty — ext-block-root spec (1.0.0)

> **Status:** implemented by the `@nuckty/ext-block-root` package
> (`register(env)` registers a document handler and adds its `blocks/` level; the `root` template lives in
> `blocks/root/root.nu.ts`). A consumer-level `blocks/root/root.nu.ts` on a
> later level remains a valid override.

## Purpose

Specify the standard document extension: it registers a handler and supplies the root block, whose template builds html/head/body. Every build requires a document handler; a consumer may supply another handler without installing this package. The root/page naming convention belongs to this standard extension.

## Requirements

### Requirement: root builds the document
`@nuckty/ext-block-root` SHALL register a document handler through `env.document` and supply one block, `root`, via `env.levels`. The handler SHALL return a `root` node with `DocumentData` in `props`. `root` SHALL use the `wrap` mode to wrap page content in `<html>` (with `lang` from props), `<head>`, and `<body>`. Because `wrap` is a control mode, the `root` template SHALL fire once, so child `head`/`body`/`meta` nodes do not re-trigger it (no recursion).

#### Scenario: root wraps content once
- **WHEN** the engine passes `DocumentData` to the registered handler
- **THEN** the handler returns `{ block: 'root', props: data, content: data.content }`
- **AND** the engine does not know the `root` block name
- **WHEN** that node is serialized
- **THEN** `root` wraps it in `<html lang=...>`, `<head>`, `<body>`
- **AND** the wrap fires once without recursing into its own children

### Requirement: Page data via props
`root` SHALL receive `DocumentData` through `n.props`: page metadata, content, asset maps, sitemap, target data, language, and alternates. The default root SHALL include each distinct, nonempty supplied CSS URL once as a stylesheet link in `<head>` and each distinct, nonempty supplied JS URL once as a deferred script after page content. It SHALL not infer bundle names or page ownership; a consumer that needs page-specific bundle selection MAY override `root` on a later level.

#### Scenario: Block reads page data from props
- **WHEN** `root` renders with page data and duplicate or empty bundle references
- **THEN** it emits the title, optional alternate links, and each distinct nonempty CSS/JS URL once
- **AND** absent CSS/JS references add no asset tags
- **AND** the engine does not decide the `<head>` contents

### Requirement: root and page contract
The extension SHALL own only `root` (the outer wrapper). The `page*` namespace (`page`, `page-index`, `page-about`, ...) SHALL be reserved for the site, so an author names pages `page-*` without colliding with the engine. `root` SHALL be overridable by placing `blocks/root/root.nu.ts` on a later level.

#### Scenario: Site overrides root without forking
- **WHEN** a site places its own `blocks/root/root.nu.ts` on a later level
- **THEN** the site's `root` wins by level priority
- **AND** `page*` names remain free for the site
