# nuckty-demo — spec

## Purpose

The demo is an interactive capabilities showcase and integration consumer for the CLI, document extension, blocks, Markdown, packaged gallery/grid/typography and the actual renderer. Its dependencies resolve to packages in the monorepo workspace; the browser adapter uses the public browser entry. Serving and external HTML validation are separate checks.

## Requirements

### Requirement: Declares nuckty as a dependency and builds via the CLI
The demo SHALL declare `@nuckty/core` as a workspace-resolved dependency and invoke the build via the `nuckty` CLI bin (`"build": "..."`). The build SHALL resolve the demo root as `process.cwd()`, read the demo's `config/`, and write the built site under the demo's output dir. (Engine: "Consumption via dependency + CLI".)

#### Scenario: Clean clone builds
- **WHEN** the workspace dependencies are installed and `npm run build` runs from the repository root
- **THEN** the build completes without errors
- **AND** writes `site/html/index.html`

### Requirement: Supplies the public config contract
The demo SHALL provide `config/site.json`, `config/sitemap.yml` with a landing page and Markdown, media, playground and output routes, `config/levels.json` (`["content", "blocks"]`), and `config/external.json` (`[]`).

#### Scenario: Config dir carries the contract files
- **WHEN** the demo config dir is inspected
- **THEN** all four files and all five showcase routes are present

### Requirement: Supplies blocks as extensions
The demo SHALL load the root, gallery, grid and typography packages through ext[]. Site block templates SHALL export a default templates() function and load through configured levels and the page bemdecl. A local extension SHALL add showcase directives and a build-files snapshot before manifest generation.

#### Scenario: Blocks are declared in ext
- **WHEN** `config-nuckty.ts` is inspected
- **THEN** the packaged extensions and local showcase extension are listed in ext[], while templates load through levels and the page declaration

### Requirement: Renders markdown through the single engine
The demo’s Markdown SHALL become a BEMTree through the core Markdown bridge and be serialized by the nu renderer. The build MAY pass already serialized article content to the document handler through trusted raw markup; there is no alternative template engine.

#### Scenario: Markdown produces article BemNode
- **WHEN** the Markdown showcase builds
- **THEN** the output HTML contains `article__heading`, `article__paragraph`,
  `article__list`, `article__inline-code` classes
- **AND** the heading has a hierarchical `id` derived from its text

### Requirement: Output is minimal and valid
The built index.html SHALL use the serializer’s minimization rules: supported optional tags omitted, attributes unquoted where permitted and void elements without a slash. Actual fixture validity SHALL be checked on the built artifact through Nu Html Checker rather than inferred from compactness.

#### Scenario: Optional tags omitted
- **WHEN** the built `index.html` is inspected
- **THEN** it does not contain `</html>` or `</body>`
- **AND** single-token attribute values are unquoted (e.g. `charset=utf-8`)

### Requirement: Documents itself
The demo SHALL ship a README explaining how to run it and what it proves, so a new consumer author can copy it as a starting point.

#### Scenario: README explains the demo
- **WHEN** the demo README is read
- **THEN** it explains how to run the build and what the demo proves

### Requirement: Source and result panels
The demo SHALL display actual sample sources beside their rendered Markdown results, with keyboard-operable tabs.

#### Scenario: Inspect a sample
- **WHEN** a visitor selects the source tab
- **THEN** the exact sample input is visible and the result panel is hidden

### Requirement: Live renderer
The demo SHALL use the real engine to render editable BEMJSON and show resolved BEMJSON, minimal HTML and a sandboxed preview. Invalid JSON SHALL display an error that clears when input becomes valid.

#### Scenario: Edit a tree
- **WHEN** valid BEMJSON changes
- **THEN** the engine updates the output and preview in the browser

### Requirement: Direct capability entry
The demo landing page SHALL expose the actual editable renderer and actual gallery/grid samples, rather than only links to them. Compact layout SHALL retain readable controls and responsive behavior.

#### Scenario: Try the engine from home
- **WHEN** a visitor edits valid BEMJSON on the landing page
- **THEN** the actual engine updates resolved BEMJSON, HTML and the sandboxed preview

### Requirement: Precise demo instructions
The demo copy SHALL distinguish rendered examples, original source, the public file snapshot and the deployment manifest. It SHALL explain unfamiliar terms before relying on them in instructions.

#### Scenario: Inspect build output
- **WHEN** a visitor opens the output page
- **THEN** the page explains which files are measured and which require local artifact access

### Requirement: Fluid typography and restrained visual style
The consumer SHALL use a primary text typeface and monospace code, a flat palette with one interface accent per theme, and semantic fluid font sizes with readable limits. The header mark SHALL remain prominent alongside the wordmark.

#### Scenario: Resize the viewport
- **WHEN** viewport width changes across phone, tablet and desktop layouts
- **THEN** font sizes change smoothly within their limits
- **AND** content and controls remain available without document-level horizontal overflow

### Requirement: Readable initial editor samples
The editor SHALL soft-wrap long JSON lines without changing its value. Its initial selected sample SHALL remain readable without horizontal clipping, with readable fluid type and manual vertical resizing.

#### Scenario: Open a preset
- **WHEN** a preset is selected on phone or desktop
- **THEN** its JSON remains valid and long lines wrap inside the editing field
- **AND** the complete initial sample is available without horizontal scrolling

### Requirement: Distinct logo eyes in both themes
The consumer SHALL use dark green eyes against the pale head in the dark theme and preserve the supplied mark geometry.

#### Scenario: Switch to dark theme
- **WHEN** a visitor switches to the dark theme
- **THEN** the logo eyes remain clearly distinguishable from the head

### Requirement: Unified demo wordmark
The demo header SHALL display nuckty demo with one typeface, font size and weight.

#### Scenario: Read the header
- **WHEN** the demo opens at phone or desktop width
- **THEN** both words share the same typographic treatment and remain visible

### Requirement: Russian gallery accessible names
The Russian demo SHALL label its image viewer and close control in Russian while retaining the native modal and return-focus behavior.

#### Scenario: Open an image
- **WHEN** a reader opens a gallery image
- **THEN** the viewer and close control have Russian accessible names
- **AND** Escape returns focus to the opening image

### Requirement: Readable article code lines
Article and example-source code blocks SHALL soft-wrap long lines within the available width while preserving literal whitespace and the exact copy payload. Example-source panels SHALL provide the same copy control as article code blocks.

#### Scenario: Read a long installation command
- **WHEN** a code line exceeds the article width on phone or desktop
- **THEN** the full line remains readable within the code block
- **AND** copying returns the original text without inserted line breaks

### Requirement: Progressive navigation and controls
Before client initialization, the consumer SHALL expose ordinary mobile navigation links and a compact section-index entry instead of inactive navigation buttons. Script-dependent controls SHALL become available after their handlers are installed. Enhanced menu focus, Escape and modal behavior SHALL be preserved.

#### Scenario: Scripts do not execute
- **WHEN** page scripts are unavailable or blocked
- **THEN** readers can follow the main navigation and section-index links
- **AND** inactive search, theme and menu buttons are hidden

#### Scenario: Scripts initialize
- **WHEN** navigation handlers are installed
- **THEN** the existing compact mobile menu and sidebar controls work as before

### Requirement: Reflow with enlarged text
The consumer SHALL allow its header groups and headings to reflow with an enlarged base font size. Menu placement and document anchor offsets SHALL follow the actual enhanced header height.

#### Scenario: Double the base font size
- **WHEN** the base font is doubled on a narrow viewport
- **THEN** header text and controls remain available without document overflow

### Requirement: Editor initialization fallback
The demo SHALL show a concise static explanation before the editor initializes and expose its editing controls only after initialization. Static examples SHALL remain available.

#### Scenario: Editor script is unavailable
- **WHEN** the editor does not initialize
- **THEN** an explanation replaces the empty editing controls and preview

### Requirement: Discoverable persistent theme control
The enhanced consumer SHALL expose a recognizable theme button with a touch target of at least 40 CSS pixels in each dimension on mobile and desktop. A visitor choice SHALL persist in localStorage on the same origin across navigation and reload. Mobile header controls SHALL remain reachable alongside the prominent wordmark.

#### Scenario: Return to a selected theme
- **WHEN** a visitor selects a theme and navigates to another page or reloads it
- **THEN** the selected theme and button state are restored
- **AND** the button remains visible at phone widths

### Requirement: Compact readable article entry
The consumer SHALL show an ancestor breadcrumb trail without duplicating the current article heading. Breadcrumbs and section controls SHALL use readable fluid interface type. The mobile parent link and section toggle SHALL share one compact navigation band above the heading when space permits and wrap with enlarged text. Desktop SHALL retain the full ancestor trail. Both layouts SHALL preserve complete labels and section navigation.

#### Scenario: Read a deeply nested article on a phone
- **WHEN** a nested page opens on a narrow viewport
- **THEN** the ancestor trail wraps without clipping or repeating the article title
- **AND** the section toggle remains usable without excessive space above the article

### Requirement: Unframed theme and animated burger
The consumer SHALL retain the theme touch target without a border. The burger SHALL morph its existing lines into a cross with a 0.3 second transition, remain rendered during the transition, and honor reduced-motion preferences.

#### Scenario: Open mobile navigation
- **WHEN** the mobile toggle opens navigation
- **THEN** its existing lines visibly converge and rotate into a cross

### Requirement: Stable footer links
Footer text and links SHALL share consistent baselines and spacing, including narrow wrapped layouts. Documentation page source links SHALL appear inside the footer rather than beneath the article.

#### Scenario: Read a documentation footer
- **WHEN** the reader reaches the footer on a phone or desktop
- **THEN** the page source link belongs to its navigation and shares its type and alignment

### Requirement: Compact branded footer
The footer SHALL place the nuckty logo and made-with caption on the left and vertically stacked GitHub, contextual page source and MIT entries aligned right on both phone and desktop. The guide link SHALL be absent.

#### Scenario: Reach the footer
- **WHEN** a page ends
- **THEN** the footer follows the requested left identity and right navigation hierarchy without overflow

### Requirement: Directional neighboring page links
Neighboring links SHALL show the page name and an outward chevron at the corresponding side without visible direction captions. Direction SHALL remain accessible and a missing neighbor SHALL not move the other to the wrong side.

#### Scenario: Continue reading
- **WHEN** a reader reaches the neighboring links
- **THEN** the preceding page is on the left and the following page on the right

### Requirement: Prominent neighboring chevrons
Neighboring chevrons SHALL be large white background graphics behind the page names rather than separate foreground elements. Text SHALL remain readable in both themes.

#### Scenario: Continue reading
- **WHEN** neighboring page links are visible
- **THEN** their directional chevrons sit behind the text as a restrained background at phone and desktop widths

### Requirement: Text-anchored broad neighboring arrows
Background chevrons SHALL preserve their original 30 by 84 px path geometry and angle while tripling stroke thickness from 6 to 18 px. They SHALL begin at the page-name block and remain behind text without occupying layout space. Their SVG viewport SHALL contain the full stroke without clipping.

#### Scenario: Read neighboring links
- **WHEN** names are visible
- **THEN** arrows retain their original angle with a triple-thickness stroke

### Requirement: Unruled ending navigation
The neighboring links and footer SHALL have no top horizontal separator.

#### Scenario: Reach the page ending
- **WHEN** neighboring links and footer are visible
- **THEN** neither has a horizontal rule above it

### Requirement: Bottom-aligned footer navigation
The right footer navigation SHALL align its bottom edge with the left identity block.

#### Scenario: Reach the footer
- **WHEN** both footer columns are visible
- **THEN** their bottom edges align

### Requirement: Larger fluid reading text
Main reading text SHALL grow continuously from 17px at 320px viewport width to 20px at 1280px, bounded at those sizes.

#### Scenario: Resize the reading page
- **WHEN** the viewport changes from mobile to desktop
- **THEN** main text grows without horizontal page overflow

### Requirement: Static syntax highlighting
Static fenced code and source examples SHALL receive semantic token markup at build time using TanStack Highlight, without a browser highlighter. Source text SHALL remain unchanged. Unknown languages SHALL remain plain text. Two themes SHALL use shared markup and CSS without line numbers.

#### Scenario: Read or copy a snippet
- **WHEN** a static snippet is displayed or copied
- **THEN** token colors follow the selected theme and its text remains unchanged

### Requirement: Contrasting neighboring-page background
The neighboring-page area SHALL use a white background and paper-colored arrows in the light theme, with corresponding dark-theme colors.

#### Scenario: Reach neighboring pages
- **WHEN** the light theme is selected
- **THEN** the area is white and arrows match the main page background

### Requirement: Bilingual demo
The demo SHALL build Russian and English targets with translated pages, examples and interactive controls on demo.nuckty.ru and demo.nuckty.com.

#### Scenario: Requested behavior
- **WHEN** both demo targets are built
- **THEN** each target has five pages, the correct language, canonical origin and alternate-language links

### Requirement: Declares two language targets
The demo SHALL declare Russian default and English en targets with separate configuration directories, output roots and hosts. Russian SHALL retain site/; English SHALL use site-en/.

#### Scenario: Two language targets
- **WHEN** config/config-nuckty.ts is inspected
- **THEN** default and en share demo blocks and generate separate Russian and English outputs

## Out of scope for the demo
- Multi-target builds and cross-target hreflang are demonstrated by the sibling website consumer.
- External FTP publication, content acquisition and third-party video services are documented rather than executed by the demo build.
