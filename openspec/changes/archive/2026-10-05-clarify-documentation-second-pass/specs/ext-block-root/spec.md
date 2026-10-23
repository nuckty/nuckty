## MODIFIED Requirements

### Requirement: root builds the document
`nuckty-ext-block-root` SHALL register a document handler through `env.document` and supply one block, `root`, via `env.levels`. The handler SHALL return a `root` node with `DocumentData` in `props`. `root` SHALL use the `wrap` mode to wrap page content in `<html>` (with `lang` from props), `<head>`, and `<body>`. Because `wrap` is a control mode, the `root` template SHALL fire once, so child `head`/`body`/`meta` nodes do not re-trigger it (no recursion).

#### Scenario: root wraps content once
- **WHEN** the engine passes `DocumentData` to the registered handler
- **THEN** the handler returns `{ block: 'root', props: data, content: data.content }`
- **AND** the engine does not know the `root` block name
- **WHEN** that node is serialized
- **THEN** `root` wraps it in `<html lang=...>`, `<head>`, `<body>`
- **AND** the wrap fires once without recursing into its own children

### Requirement: root and page contract
The extension SHALL own only `root` (the outer wrapper). The `page*` namespace (`page`, `page-index`, `page-about`, ...) SHALL be reserved for the site, so an author names pages `page-*` without colliding with the engine. `root` SHALL be overridable by placing `blocks/root/root.nu.ts` on a later level.

#### Scenario: Site overrides root without forking
- **WHEN** a site places its own `blocks/root/root.nu.ts` on a later level
- **THEN** the site's `root` wins by level priority
- **AND** `page*` names remain free for the site

