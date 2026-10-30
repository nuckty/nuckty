## MODIFIED Requirements

### Requirement: Grid, lightbox, lazy loading
The gallery block SHALL lay images out as a responsive CSS grid; a click SHALL open a full-size view in the nearest gallery’s lightbox, without external JavaScript libraries. All gallery images except the first SHALL be lazy-loaded. The first image is local to each gallery; viewport visibility SHALL NOT be inferred. The handler SHALL emit data only — image URL, alt text, lazy flag and the page language — and the `gallery` and `lightbox` templates SHALL build the markup, with lightbox labels in Russian for `ru` and in English otherwise.

#### Scenario: Gallery behavior
- **WHEN** a gallery renders several images
- **THEN** they lay out as a grid and clicking an item opens that gallery’s built-in lightbox
- **AND** every image except the first carries loading=lazy

#### Scenario: Labels follow the page language
- **WHEN** a gallery renders on a Russian target
- **THEN** the lightbox is labelled «Просмотр изображения» and its close button «Закрыть изображение»
