# nuckty — ext-block-gallery spec (1.0.0)

> **Status:** implemented by the `@nuckty/ext-block-gallery` package (one
> `register(env)`: `gallery` + `lightbox` blocks via `env.levels`, the
> `:::gallery` construct via `env.markdown.directive`). Site-specific
> constructs (`:::partner-link`, raw-HTML variants) stay in the consumer.

## Purpose

Specify `@nuckty/ext-block-gallery`, a package that combines two extension types in one `register(env)`: the `gallery` block (with a `lightbox` helper) via `env.levels`, and the `:::gallery` markdown construct via `env.markdown`. It is the reference example of a markdown construct expanding into a block.

## Requirements

### Requirement: Combined block + markdown package
The package SHALL supply, through one `register(env)`, the `gallery` block (and `lightbox`) via `env.levels` and the `:::gallery` construct via `env.markdown`. The markdown transform SHALL find the container node and turn it into `gallery` BEMJSON with a list of images; the engine rewrites each image via `image-mapping.json`.

#### Scenario: Construct expands into the block
- **WHEN** a `.md` contains a `:::gallery` block of images and the extension is loaded
- **THEN** the construct becomes `gallery` BEMJSON and the block loads by deps
- **AND** each image is rewritten via `image-mapping.json`

### Requirement: Grid, lightbox, lazy loading
The gallery block SHALL lay images out as a responsive CSS grid; a click SHALL open a full-size view in the nearest gallery’s lightbox, without external JavaScript libraries. All gallery images except the first SHALL be lazy-loaded. The first image is local to each gallery; viewport visibility SHALL NOT be inferred. The handler SHALL emit data only — image URL, alt text, lazy flag and the page language — and the `gallery` and `lightbox` templates SHALL build the markup, with lightbox labels in Russian for `ru` and in English otherwise.

#### Scenario: Gallery behavior
- **WHEN** a gallery renders several images
- **THEN** they lay out as a grid and clicking an item opens that gallery’s built-in lightbox
- **AND** every image except the first carries loading=lazy

#### Scenario: Labels follow the page language
- **WHEN** a gallery renders on a Russian target
- **THEN** the lightbox is labelled «Просмотр изображения» and its close button «Закрыть изображение»

### Requirement: Overridable like any block
`gallery` SHALL be overridable by placing `blocks/gallery/gallery.nu.ts` on a later level; its CSS SHALL be tunable by adding a later CSS layer via deps.

#### Scenario: Site overrides the gallery block
- **WHEN** a site places its own `gallery.nu.ts` on a later level
- **THEN** the site's version wins by level priority

### Requirement: Gallery holds images only
A `:::gallery` container SHALL contain only images, optionally separated by whitespace and line breaks. Text, links, captions outside alt text and other blocks SHALL fail the build with an error naming the unsupported node instead of being dropped.

#### Scenario: Caption paragraph in a gallery
- **WHEN** a gallery paragraph contains an image followed by caption text
- **THEN** the build fails with an error that names the text node
