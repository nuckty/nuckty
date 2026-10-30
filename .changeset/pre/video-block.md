---
"@nuckty/ext-markdown-video": minor
---

`@[provider](id)` now becomes a block-level `video` node rendered by the package's new `video` block: the template outputs `<iframe class=video__frame>` with a title in the page language, and responsive CSS ships with it. Add `video` to the bundle's bemdecl. Providers need a display `label`; use `createVideoExtension(providers)` for a custom provider list.
