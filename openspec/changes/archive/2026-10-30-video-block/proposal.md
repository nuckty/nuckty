# Render videos with the video block

## Why

The video extension rendered player HTML with a private template collection and passed it to the bridge as a string, so sites could not change the markup and the core had to detect block HTML inside paragraphs. The frame title was English on every site.

## What Changes

- **BREAKING** The remark plugin inserts block-level `video` mdast nodes and splits the surrounding paragraph; a node handler maps them to the `video` block.
- **BREAKING** The package ships `blocks/video` with the template and responsive CSS; the frame class is `video__frame` and the title follows the page language.
- **BREAKING** Providers carry a display `label`; `createVideoExtension(providers)` builds a `register` for a custom list.
