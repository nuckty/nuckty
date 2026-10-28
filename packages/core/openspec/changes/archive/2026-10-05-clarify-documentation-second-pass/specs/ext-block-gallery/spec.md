## MODIFIED Requirements

### Requirement: Combined block + markdown package
The package SHALL supply, through one `register(env)`, the `gallery` block (and `lightbox`) via `env.levels` and the `:::gallery` construct via `env.markdown`. The markdown transform SHALL find the container node and turn it into `gallery` BEMJSON with a list of images; the engine rewrites each image via `image-mapping.json`.

#### Scenario: Construct expands into the block
- **WHEN** a `.md` contains a `:::gallery` block of images and the extension is loaded
- **THEN** the construct becomes `gallery` BEMJSON and the block loads by deps
- **AND** each image is rewritten via `image-mapping.json`

### Requirement: Grid, lightbox, lazy loading
The `gallery` block SHALL lay images out as a responsive CSS grid; a click SHALL open a full-size view via the `lightbox` block, implemented without external JS libraries; all gallery images except the first SHALL get `loading=lazy` (the first is local to each gallery; viewport visibility is not inferred).

#### Scenario: Gallery behavior
- **WHEN** a gallery renders several images
- **THEN** they lay out as a grid and click opens the built-in lightbox
- **AND** every image except the first carries `loading=lazy`

### Requirement: Overridable like any block
`gallery` SHALL be overridable by placing `blocks/gallery/gallery.nu.ts` on a later level; its CSS SHALL be tunable by adding a later CSS layer via deps.

#### Scenario: Site overrides the gallery block
- **WHEN** a site places its own `gallery.nu.ts` on a later level
- **THEN** the site's version wins by level priority
