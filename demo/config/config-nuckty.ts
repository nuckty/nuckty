import { defineNucktyConfig } from '@nuckty/core';

const preview = process.env['NUCKTY_PREVIEW'] === '1';

export default defineNucktyConfig({
    targets: {
        default: {
            configDir: 'config/', outDir: 'site/', lang: 'ru', host: 'demo.nuckty.ru', group: 'demo',
            data: { kind: 'demo', siteUrl: preview ? 'http://localhost:8091' : 'https://nuckty.ru', alternateOrigin: preview ? 'http://localhost:8094' : 'https://demo.nuckty.com' },
        },
        en: {
            configDir: 'config/en/', outDir: 'site-en/', lang: 'en', host: 'demo.nuckty.com', group: 'demo',
            data: { kind: 'demo', siteUrl: preview ? 'http://localhost:8093' : 'https://nuckty.com', alternateOrigin: preview ? 'http://localhost:8092' : 'https://demo.nuckty.ru' },
        },
    },
    ext: [
        // Block extension with the document handler and the page wrapper.
        '@nuckty/ext-block-root',
        './ext/highlight.ts',
        '@nuckty/ext-block-gallery',
        '@nuckty/ext-block-grid',
        '@nuckty/ext-markdown-typography-ru',
        // Command extensions resolve from installed packages.
        '@nuckty/ext-command-serve',
        '@nuckty/ext-command-validate-vnu',
        '@nuckty/ext-command-deploy-ftp',
        './ext/showcase.ts',
    ],
});
