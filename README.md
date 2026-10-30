# nuckty

nuckty is a static site generator with a BEMJSON template engine and optional extensions.

| Package | Directory | Description |
|---|---|---|
| [@nuckty/core](https://www.npmjs.com/package/@nuckty/core) | [packages/core](packages/core/) | Core: BEMJSON template engine, programmable build pipeline, multiple targets. |
| [@nuckty/ext-block-gallery](https://www.npmjs.com/package/@nuckty/ext-block-gallery) | [packages/ext-block-gallery](packages/ext-block-gallery/) | Image gallery with a lightbox via `:::gallery`. |
| [@nuckty/ext-block-grid](https://www.npmjs.com/package/@nuckty/ext-block-grid) | [packages/ext-block-grid](packages/ext-block-grid/) | Multi-column grid via `:::grid`. |
| [@nuckty/ext-block-root](https://www.npmjs.com/package/@nuckty/ext-block-root) | [packages/ext-block-root](packages/ext-block-root/) | The `root` page wrapper block (`<html>`, `<head>`, `<body>`). |
| [@nuckty/ext-command-content-external](https://www.npmjs.com/package/@nuckty/ext-command-content-external) | [packages/ext-command-content-external](packages/ext-command-content-external/) | Command that populates content from external Git repositories. |
| [@nuckty/ext-command-convert-images](https://www.npmjs.com/package/@nuckty/ext-command-convert-images) | [packages/ext-command-convert-images](packages/ext-command-convert-images/) | Command that encodes PNG/JPEG to AVIF and WebP via sharp. |
| [@nuckty/ext-command-deploy-ftp](https://www.npmjs.com/package/@nuckty/ext-command-deploy-ftp) | [packages/ext-command-deploy-ftp](packages/ext-command-deploy-ftp/) | Command that publishes the built site over FTP/FTPS. |
| [@nuckty/ext-command-serve](https://www.npmjs.com/package/@nuckty/ext-command-serve) | [packages/ext-command-serve](packages/ext-command-serve/) | Commands that serve the site locally and stop the preview. |
| [@nuckty/ext-command-validate-vnu](https://www.npmjs.com/package/@nuckty/ext-command-validate-vnu) | [packages/ext-command-validate-vnu](packages/ext-command-validate-vnu/) | Command that validates HTML with vnu.jar. |
| [@nuckty/ext-markdown-typography-ru](https://www.npmjs.com/package/@nuckty/ext-markdown-typography-ru) | [packages/ext-markdown-typography-ru](packages/ext-markdown-typography-ru/) | Russian typography: dashes and non-breaking spaces. |
| [@nuckty/ext-markdown-video](https://www.npmjs.com/package/@nuckty/ext-markdown-video) | [packages/ext-markdown-video](packages/ext-markdown-video/) | Video embedding via `@[provider](id)`. |

[Documentation](docs/) · [Demo](https://demo.nuckty.com/) · [Website](https://nuckty.com/)

## Development

```sh
npm install
npm run build
npm test
npm run changeset
```
