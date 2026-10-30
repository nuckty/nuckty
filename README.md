# nuckty

nuckty is a static site generator with a BEMJSON template engine and optional extensions.

| Package | Directory | Description |
|---|---|---|
| [@nuckty/core](https://www.npmjs.com/package/@nuckty/core) | [packages/core](packages/core/) | All static site generators suck. This one just sucks less. BEMJSON template engine, programmatic pipeline, multi-target builds. |
| [@nuckty/ext-block-gallery](https://www.npmjs.com/package/@nuckty/ext-block-gallery) | [packages/ext-block-gallery](packages/ext-block-gallery/) | nuckty block+markdown-extension: image gallery with lightbox via :::gallery |
| [@nuckty/ext-block-grid](https://www.npmjs.com/package/@nuckty/ext-block-grid) | [packages/ext-block-grid](packages/ext-block-grid/) | nuckty block+markdown-extension: multi-column layout via :::grid |
| [@nuckty/ext-block-root](https://www.npmjs.com/package/@nuckty/ext-block-root) | [packages/ext-block-root](packages/ext-block-root/) | nuckty block-extension: the root page wrapper block (<html>/<head>/<body>) |
| [@nuckty/ext-command-content-external](https://www.npmjs.com/package/@nuckty/ext-command-content-external) | [packages/ext-command-content-external](packages/ext-command-content-external/) | nuckty command-extension: populate the content root from external git repositories |
| [@nuckty/ext-command-convert-images](https://www.npmjs.com/package/@nuckty/ext-command-convert-images) | [packages/ext-command-convert-images](packages/ext-command-convert-images/) | nuckty command-extension: encode content PNG/JPEG to AVIF and WebP via sharp |
| [@nuckty/ext-command-deploy-ftp](https://www.npmjs.com/package/@nuckty/ext-command-deploy-ftp) | [packages/ext-command-deploy-ftp](packages/ext-command-deploy-ftp/) | nuckty command-extension: publish a built site over FTP/FTPS |
| [@nuckty/ext-command-serve](https://www.npmjs.com/package/@nuckty/ext-command-serve) | [packages/ext-command-serve](packages/ext-command-serve/) | nuckty command-extension: serve the built site locally + stop |
| [@nuckty/ext-command-validate-vnu](https://www.npmjs.com/package/@nuckty/ext-command-validate-vnu) | [packages/ext-command-validate-vnu](packages/ext-command-validate-vnu/) | nuckty command-extension: validate built HTML with vnu.jar |
| [@nuckty/ext-markdown-typography-ru](https://www.npmjs.com/package/@nuckty/ext-markdown-typography-ru) | [packages/ext-markdown-typography-ru](packages/ext-markdown-typography-ru/) | nuckty markdown-extension: Russian em-dash + nbsp typography |
| [@nuckty/ext-markdown-video](https://www.npmjs.com/package/@nuckty/ext-markdown-video) | [packages/ext-markdown-video](packages/ext-markdown-video/) | nuckty markdown-extension: video embed via @[provider](id) |

[Documentation](docs/) · [Demo](https://demo.nuckty.com/) · [Website](https://nuckty.com/)

## Development

```sh
npm install
npm run build
npm test
npm run changeset
```
