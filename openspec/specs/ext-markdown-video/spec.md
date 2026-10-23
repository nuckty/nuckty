# nuckty — ext-markdown-video spec (1.0.0)

## Purpose

Specify `nuckty-ext-markdown-video`, the markdown-extension that maps the `@[provider](id)` syntax to a `<div class=video><iframe>` HTML node. It embeds videos from hosting services (YouTube, RuTube, VK) by a remark mdast transform before the mdast→BEMJSON bridge, with no external JS libraries in the output. The extension is a pure markdown-extension: no BEM block, no `env.levels`.

## Requirements

### Requirement: Plugin registration via env.markdown
The extension SHALL register, through `register(env)`, a remark plugin via `env.markdown.use`.

#### Scenario: Extension registers its plugin
- **WHEN** the extension is loaded via `ext[]`
- **THEN** `register(env)` adds the remark plugin through `env.markdown.use`

### Requirement: Embed pattern rewrite
The plugin SHALL rewrite a paragraph whose children are a text node ending in `@` immediately followed by a link whose only child is a provider name and whose `url` is the video id: the `@` is dropped, the link is replaced by an `html` node carrying `<div class=video><iframe class=video__iframe src=... title="provider video" loading=lazy allowfullscreen></iframe></div>`. Any text before the `@` SHALL be kept as a separate text node.

#### Scenario: A known provider is rewritten to an iframe embed
- **WHEN** a `.md` contains `@[youtube](bsgLJcQz43s)` and the extension is loaded
- **THEN** the paragraph's children become a single `html` node
- **AND** that node's value is `<div class=video><iframe class=video__iframe src=https://www.youtube.com/embed/bsgLJcQz43s title="youtube video" loading=lazy allowfullscreen></iframe></div>`
- **AND** the `@` text node is dropped (no leftover `@`)
- **AND** text before the `@` is kept as a separate text node

### Requirement: Unknown provider stays plain
An unknown provider SHALL be left as ordinary text + link (no embed).

#### Scenario: An unknown provider is left untouched
- **WHEN** a `.md` contains `@[unknown](id)` and the extension is loaded
- **THEN** the paragraph keeps the `@` text node and the link (no `html` node)
- **AND** a link not preceded by `@` is not treated as a video

### Requirement: Providers are configurable; default set is YouTube, RuTube, VK
The extension SHALL ship default providers `youtube`, `rutube`, `vk` and SHALL export a `createVideoPlugin(providers)` factory so a site can add its own. The provider match SHALL be case-insensitive on the link's only-text-child.

#### Scenario: A site adds its own provider
- **WHEN** a site builds `createVideoPlugin([...DEFAULT_VIDEO_PROVIDERS, { name: 'peertube', src: (id) => `https://peer.tv/w/${id}` }])`
- **THEN** `@[peertube](xyz)` is rewritten to an embed whose iframe src is
  `https://peer.tv/w/xyz`

### Requirement: Embed without external JS
The embed SHALL be a plain iframe; no third-party JS library is pulled into the output. The extension adds only markup; the iframe has loading=lazy and a provider-derived title; any facade behavior is the consumer’s concern.

#### Scenario: Embed carries no third-party library
- **WHEN** a video renders
- **THEN** the output embeds the player via a plain iframe, no third-party JS

### Requirement: The core knows no video provider
The core SHALL NOT hardcode any provider or video syntax. `nuckty build` SHALL produce no video embed unless this extension (or an equivalent) is loaded; the plugin lives in the extension, registered via `env.markdown`.

#### Scenario: Build without the extension has no video handling
- **WHEN** a consumer loads no video extension and a `.md` contains `@[youtube](id)`
- **THEN** the build renders it as ordinary text + link (no `html` embed node)

### Requirement: Configured provider names match without case dependence
Provider selection SHALL compare the configured provider name and authored link text without case dependence. A custom provider with mixed-case configuration SHALL behave like the same lowercase configuration. Its src function and iframe serialization SHALL remain unchanged.

#### Scenario: Mixed-case custom provider receives the video ID
- **WHEN** configuration registers PeerTube and Markdown names peertube or PEERTUBE
- **THEN** both links invoke that configured provider with the authored ID
- **AND** both produce an iframe rather than an ordinary link

