import type { DocumentData } from '@nuckty/core';
import { messages } from './root.i18n/index.js';

export type MessageKey = keyof ReturnType<typeof messages>;

/** Values the page blocks derive from the document data. */
export function pageContext(data: DocumentData) {
    const url = data.page.url;

    return {
        t: messages(data.lang),
        url,
        home: url === '/',
        origin: `https://${data.target?.host ?? ''}`,
        siteUrl: String(data.target?.data?.['siteUrl'] ?? ''),
        alternateUrl: `${String(data.target?.data?.['alternateOrigin'] ?? '')}${url}`,
        brand: data.assets.images['brand/brand.svg'],
        brandDark: data.assets.images['brand/brand-dark.svg'],
        favicon: data.assets.images['brand/favicon.svg'],
    };
}
