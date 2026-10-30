# nuckty — ext-markdown-video spec (1.0.0)

## Purpose

Specify `@nuckty/ext-markdown-video`, the extension that maps the `@[provider](id)` syntax to the `video` block. It embeds videos from hosting services (YouTube, RuTube, VK) through a remark mdast transform and a node handler, with no external JS libraries in the output.

## Requirements

### Requirement: Plugin registration via env.markdown
The extension SHALL register, through `register(env)`, a remark plugin via `env.markdown.use`, a handler for `video` nodes via `env.markdown.node`, and its `blocks/` level via `env.levels`. `createVideoExtension(providers)` SHALL return an equivalent `register` for a custom provider list.

#### Scenario: Extension registers its plugin
- **WHEN** the extension is loaded via `ext[]`
- **THEN** `register(env)` adds the remark plugin, the `video` node handler and the block level

### Requirement: Embed pattern rewrite
The plugin SHALL find a text node ending in `@` immediately followed by a link whose only child is a provider name and whose `url` is the video id. It SHALL drop the `@`, replace the link with a block-level `video` mdast node carrying the provider label and embed URL, and split the paragraph so prose before and after the embed stays in separate paragraphs; whitespace-only prose SHALL be dropped. The node handler SHALL map the node to `{ block: 'video', props: { src, provider, lang } }`, and the `video` template SHALL render `<div class=video><iframe class=video__frame src=… title=… loading=lazy allowfullscreen></iframe></div>` with the title in Russian for `ru` and in English otherwise.

#### Scenario: A known provider is rewritten to an iframe embed
- **WHEN** a `.md` contains `@[youtube](bsgLJcQz43s)` and the extension is loaded
- **THEN** the paragraph becomes a single `video` node
- **AND** the page renders `<div class=video><iframe class=video__frame src=https://www.youtube.com/embed/bsgLJcQz43s title="YouTube video" loading=lazy allowfullscreen></iframe></div>`
- **AND** the `@` text node is dropped (no leftover `@`)
- **AND** text before the `@` stays in a paragraph before the video

### Requirement: Unknown provider stays plain
An unknown provider SHALL be left as ordinary text + link (no embed).

#### Scenario: An unknown provider is left untouched
- **WHEN** a `.md` contains `@[unknown](id)` and the extension is loaded
- **THEN** the paragraph keeps the `@` text node and the link (no `video` node)
- **AND** a link not preceded by `@` is not treated as a video

### Requirement: Providers are configurable; default set is YouTube, RuTube, VK
The extension SHALL ship default providers `youtube`, `rutube`, `vk`, each with a name, a display label and a URL function, and SHALL export `createVideoPlugin(providers)` and `createVideoExtension(providers)` so a site can add its own. The provider match SHALL be case-insensitive on the link's only-text-child.

#### Scenario: A site adds its own provider
- **WHEN** a site registers `createVideoExtension([...DEFAULT_VIDEO_PROVIDERS, { name: 'peertube', label: 'PeerTube', src: (id) => `https://peer.tv/w/${id}` }])`
- **THEN** `@[peertube](xyz)` becomes a video whose iframe src is `https://peer.tv/w/xyz`

### Requirement: Embed without external JS
The embed SHALL be a plain iframe; no third-party JS library is pulled into the output. The markup SHALL come from the `video` block template, which a later level MAY override; any facade behavior is the consumer’s concern.

#### Scenario: Embed carries no third-party library
- **WHEN** a video renders
- **THEN** the output embeds the player via a plain iframe, no third-party JS

### Requirement: The core knows no video provider
The core SHALL NOT hardcode any provider or video syntax. `nuckty build` SHALL produce no video embed unless this extension (or an equivalent) is loaded.

#### Scenario: Build without the extension has no video handling
- **WHEN** a consumer loads no video extension and a `.md` contains `@[youtube](id)`
- **THEN** the build renders it as ordinary text + link

### Requirement: Configured provider names match without case dependence
Provider selection SHALL compare the configured provider name and authored link text without case dependence. A custom provider with mixed-case configuration SHALL behave like the same lowercase configuration. Its src function SHALL receive the authored id unchanged.

#### Scenario: Mixed-case custom provider receives the video ID
- **WHEN** configuration registers PeerTube and Markdown names peertube or PEERTUBE
- **THEN** both links invoke that configured provider with the authored ID
- **AND** both produce a video rather than an ordinary link
