---
"@nuckty/ext-block-gallery": minor
"@nuckty/ext-block-grid": minor
"@nuckty/ext-block-root": minor
"@nuckty/ext-command-content-external": minor
"@nuckty/ext-command-convert-images": minor
"@nuckty/ext-command-deploy-ftp": minor
"@nuckty/ext-command-serve": minor
"@nuckty/ext-command-validate-vnu": minor
"@nuckty/ext-markdown-typography-ru": minor
"@nuckty/ext-markdown-video": minor
---

Extensions declare `exports` with their package entry and `package.json` only; deep imports of `dist/` modules are no longer resolved. Block levels are still registered from the package's `blocks/` directory.
